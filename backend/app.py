import os
import uuid
import logging
import mimetypes
from datetime import datetime, date
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_file, abort
from flask_cors import CORS
from sqlalchemy.exc import IntegrityError
from werkzeug.utils import secure_filename

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

from models import db, Vehicle, Document, VALID_DOCUMENT_TYPES

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# ==========================================
# Configuration
db_user = os.environ.get("DB_USER", "postgres")
db_password = os.environ.get("DB_PASSWORD", "1234")
db_host = os.environ.get("DB_HOST", "localhost")
db_port = os.environ.get("DB_PORT", "5432")
db_name = os.environ.get("DB_NAME", "vehiclevault")

database_url = os.environ.get("DATABASE_URL")
if not database_url or os.environ.get("DB_HOST"):
    database_url = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

# When containerized, route localhost database connections to host.docker.internal
if os.environ.get("RUNNING_IN_DOCKER") == "true" and "@localhost:" in database_url:
    database_url = database_url.replace("@localhost:", "@host.docker.internal:")

if database_url.startswith("postgresql://") and not database_url.startswith("postgresql+"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Upload folder
# Inside Docker the volume is mounted at /app/uploads — use that path directly so
# all uploads land in the named Docker volume and survive container recreation.
# Outside Docker (local dev) fall back to the uploads/ directory beside this file.
if os.environ.get("RUNNING_IN_DOCKER") == "true":
    UPLOAD_FOLDER = "/app/uploads"
else:
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_FILE_SIZE_MB = int(os.environ.get("MAX_UPLOAD_MB", 10))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf"}
ALLOWED_MIME_TYPES = {"application/pdf", "application/x-pdf"}

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE_BYTES  # Flask enforces this on all requests

db.init_app(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})

with app.app_context():
    try:
        db.create_all()
        print("Connected to PostgreSQL — tables verified (vehicles, documents).")
    except Exception as e:
        print(f"Warning: Could not auto-create database tables: {e}")


# ==========================================
# Helper utilities
# ==========================================

def allowed_file(filename: str) -> bool:
    """Check file extension is .pdf (case-insensitive)."""
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def validate_pdf_mime(file_storage) -> bool:
    """Read first 5 bytes to verify %PDF magic number."""
    header = file_storage.read(5)
    file_storage.seek(0)
    return header == b"%PDF-"


def parse_date(value: str):
    """Parse ISO date string to date object, or return None."""
    if not value or not value.strip():
        return None
    try:
        return date.fromisoformat(value.strip())
    except ValueError:
        return None


# ==========================================
# Health Check (Stage 1 contract preserved)
# ==========================================

@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "name": "VehicleVault API",
        "version": "3.0.0",
        "status": "online",
    }), 200


@app.route("/api/health", methods=["GET"])
def health_check():
    db_status = "connected"
    try:
        db.session.execute(db.text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return jsonify({
        "status": "success",
        "message": "VehicleVault backend is running",
        "database": db_status,
    }), 200


@app.route("/api/health/db", methods=["GET"])
def health_db():
    """
    Dedicated database health check endpoint.
    Executes SELECT 1 on PostgreSQL and returns standard status.
    """
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify({
            "status": "success",
            "database": "connected"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "database": "disconnected",
            "message": "Database connection failed"
        }), 500


# ==========================================
# Expiry Status Helper (Stage 3.1 — Dynamic Tracking)
# ==========================================

def get_expiry_status(expiry_date_obj):
    """
    Given a date object (or None), return a dict with:
      status: VALID | EXPIRING_SOON | EXPIRED | NO_EXPIRY
      days_remaining: int (negative = past, None if no expiry)
      label: human-readable string
    Calculated from today's actual date — never hardcoded.
    """
    if expiry_date_obj is None:
        return {"status": "NO_EXPIRY", "days_remaining": None, "label": "No expiry date set"}

    today = date.today()
    delta = (expiry_date_obj - today).days  # positive = future, negative = past

    if delta < 0:
        abs_days = abs(delta)
        if abs_days == 1:
            label = "Expired yesterday"
        elif abs_days < 30:
            label = f"Expired {abs_days} days ago"
        elif abs_days < 365:
            months = abs_days // 30
            label = f"Expired {months} month{'s' if months > 1 else ''} ago"
        else:
            years = abs_days // 365
            label = f"Expired {years} year{'s' if years > 1 else ''} ago"
        return {"status": "EXPIRED", "days_remaining": delta, "label": label}
    elif delta <= 30:
        if delta == 0:
            label = "Expires today!"
        elif delta == 1:
            label = "Expires tomorrow"
        else:
            label = f"Expires in {delta} days"
        return {"status": "EXPIRING_SOON", "days_remaining": delta, "label": label}
    else:
        if delta < 365:
            months = round(delta / 30)
            label = f"Expires in {months} month{'s' if months > 1 else ''}"
        else:
            years = delta // 365
            rem_months = (delta % 365) // 30
            if rem_months:
                label = f"Expires in {years}y {rem_months}m"
            else:
                label = f"Expires in {years} year{'s' if years > 1 else ''}"
        return {"status": "VALID", "days_remaining": delta, "label": label}


# ==========================================
# Stats API (Stage 3.1 — Document Summary)
# ==========================================

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """
    GET /api/stats
    Returns real document expiry statistics calculated from today's date.
    All counts are computed from PostgreSQL — nothing is hardcoded.
    """
    try:
        today = date.today()
        soon_threshold = today

        documents = Document.query.all()
        vehicles_count = Vehicle.query.count()

        total = len(documents)
        expired = 0
        expiring_soon = 0
        valid = 0
        no_expiry = 0
        alerts = []  # documents expiring within 30 days, for dashboard notifications

        for doc in documents:
            if doc.expiry_date is None:
                no_expiry += 1
                continue
            info = get_expiry_status(doc.expiry_date)
            if info["status"] == "EXPIRED":
                expired += 1
            elif info["status"] == "EXPIRING_SOON":
                expiring_soon += 1
                # Build alert entry (sorted by urgency in the frontend)
                alert_label = info["label"]
                alerts.append({
                    "document_id": doc.id,
                    "document_name": doc.document_name,
                    "document_type": doc.document_type,
                    "vehicle_id": doc.vehicle_id,
                    "vehicle_reg": doc.vehicle.registration_number if doc.vehicle else None,
                    "expiry_date": doc.expiry_date.isoformat(),
                    "days_remaining": info["days_remaining"],
                    "label": alert_label,
                    "status": info["status"],
                })
            else:
                valid += 1

        # Sort alerts: most urgent first (fewest days remaining)
        alerts.sort(key=lambda a: a["days_remaining"])

        return jsonify({
            "status": "success",
            "vehicles": vehicles_count,
            "documents": {
                "total": total,
                "valid": valid,
                "expiring_soon": expiring_soon,
                "expired": expired,
                "no_expiry": no_expiry,
            },
            "alerts": alerts,
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# Dashboard API (Final Stage — Unified Endpoint)
# ==========================================

@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    """
    GET /api/dashboard
    Returns a single unified payload for the Dashboard page:
      - vehicle_overview : first/most-recently-added vehicle details
      - vehicles         : all vehicles list
      - statistics       : document expiry counts (live from today's date)
      - recent_documents : latest 5 uploaded documents
      - expiry_alerts    : expired + expiring-soon documents (≤30 days), sorted by urgency
    Nothing is hardcoded — every value is queried from PostgreSQL.
    """
    try:
        today = date.today()

        # ---- Vehicles ----
        vehicle_id = request.args.get("vehicle_id", type=int)
        vehicles = Vehicle.query.order_by(Vehicle.created_at.desc()).all()
        vehicle_overview = None
        if vehicle_id:
            v_match = db.session.get(Vehicle, vehicle_id)
            if v_match:
                vehicle_overview = v_match.to_dict()
        if not vehicle_overview and vehicles:
            vehicle_overview = vehicles[0].to_dict()

        # ---- Documents ----
        all_docs = Document.query.order_by(Document.created_at.desc()).all()

        total = len(all_docs)
        valid_count = 0
        expiring_soon_count = 0
        expired_count = 0
        no_expiry_count = 0
        alerts = []

        for doc in all_docs:
            info = get_expiry_status(doc.expiry_date)
            doc_data = doc.to_dict(include_vehicle=True)
            doc_data["expiry_status"] = info

            if info["status"] == "NO_EXPIRY":
                no_expiry_count += 1
            elif info["status"] == "EXPIRED":
                expired_count += 1
                alerts.append(doc_data)
            elif info["status"] == "EXPIRING_SOON":
                expiring_soon_count += 1
                alerts.append(doc_data)
            else:
                valid_count += 1

        # Sort alerts: most urgent (smallest / most negative days) first
        alerts.sort(key=lambda d: d["expiry_status"]["days_remaining"] if d["expiry_status"]["days_remaining"] is not None else 9999)

        # Recent documents: latest 5 regardless of status
        recent = all_docs[:5]
        recent_data = []
        for doc in recent:
            d = doc.to_dict(include_vehicle=True)
            d["expiry_status"] = get_expiry_status(doc.expiry_date)
            recent_data.append(d)

        return jsonify({
            "status": "success",
            "vehicle_overview": vehicle_overview,
            "vehicles": [v.to_dict() for v in vehicles],
            "statistics": {
                "total_vehicles": len(vehicles),
                "total_documents": total,
                "valid": valid_count,
                "expiring_soon": expiring_soon_count,
                "expired": expired_count,
                "no_expiry": no_expiry_count,
            },
            "recent_documents": recent_data,
            "expiry_alerts": alerts,
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# Vehicle CRUD (Stage 2 — updated to use db.session.get)
# ==========================================

def validate_vehicle_payload(data, is_update=False):
    errors = []
    required_fields = [
        "owner_name", "registration_number", "manufacturer",
        "model", "vehicle_type", "manufacturing_year"
    ]
    if not is_update:
        for field in required_fields:
            val = data.get(field)
            if val is None or (isinstance(val, str) and not val.strip()):
                errors.append(f"Field '{field}' is required and cannot be empty.")

    if "manufacturing_year" in data and data["manufacturing_year"] is not None:
        try:
            year = int(data["manufacturing_year"])
            current_year = datetime.now().year
            if year < 1900 or year > current_year + 5:
                errors.append(f"Manufacturing year must be between 1900 and {current_year + 5}.")
        except (ValueError, TypeError):
            errors.append("Manufacturing year must be a valid number.")

    if "registration_number" in data and data["registration_number"] is not None:
        reg_num = str(data["registration_number"]).strip()
        if len(reg_num) < 2 or len(reg_num) > 30:
            errors.append("Registration number must be between 2 and 30 characters.")

    return errors


@app.route("/api/vehicles", methods=["GET"])
def get_vehicles():
    try:
        vehicles = Vehicle.query.order_by(Vehicle.created_at.desc()).all()
        return jsonify({
            "status": "success",
            "count": len(vehicles),
            "vehicles": [v.to_dict() for v in vehicles]
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/vehicles/<int:vehicle_id>", methods=["GET"])
def get_vehicle_by_id(vehicle_id):
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify({"status": "error", "message": f"Vehicle {vehicle_id} not found."}), 404
    return jsonify({"status": "success", "vehicle": vehicle.to_dict()}), 200


@app.route("/api/vehicles", methods=["POST"])
def create_vehicle():
    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON body."}), 400

    errors = validate_vehicle_payload(data)
    if errors:
        return jsonify({"status": "error", "message": "Validation failed.", "errors": errors}), 400

    registration_number = data["registration_number"].strip().upper()
    if Vehicle.query.filter_by(registration_number=registration_number).first():
        return jsonify({"status": "error", "message": f"Registration number '{registration_number}' already exists."}), 409

    try:
        vehicle = Vehicle(
            owner_name=data["owner_name"].strip(),
            registration_number=registration_number,
            manufacturer=data["manufacturer"].strip(),
            model=data["model"].strip(),
            vehicle_type=data["vehicle_type"].strip(),
            manufacturing_year=int(data["manufacturing_year"]),
        )
        db.session.add(vehicle)
        db.session.commit()
        return jsonify({"status": "success", "message": "Vehicle created.", "vehicle": vehicle.to_dict()}), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({"status": "error", "message": "Duplicate registration number."}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/vehicles/<int:vehicle_id>", methods=["PUT"])
def update_vehicle(vehicle_id):
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify({"status": "error", "message": f"Vehicle {vehicle_id} not found."}), 404

    data = request.get_json()
    if not data:
        return jsonify({"status": "error", "message": "Invalid JSON body."}), 400

    errors = validate_vehicle_payload(data, is_update=True)
    if errors:
        return jsonify({"status": "error", "message": "Validation failed.", "errors": errors}), 400

    if "registration_number" in data:
        new_reg = data["registration_number"].strip().upper()
        if new_reg != vehicle.registration_number:
            conflict = Vehicle.query.filter_by(registration_number=new_reg).first()
            if conflict:
                return jsonify({"status": "error", "message": f"Registration '{new_reg}' already exists."}), 409
            vehicle.registration_number = new_reg

    if "owner_name" in data and data["owner_name"]:
        vehicle.owner_name = data["owner_name"].strip()
    if "manufacturer" in data and data["manufacturer"]:
        vehicle.manufacturer = data["manufacturer"].strip()
    if "model" in data and data["model"]:
        vehicle.model = data["model"].strip()
    if "vehicle_type" in data and data["vehicle_type"]:
        vehicle.vehicle_type = data["vehicle_type"].strip()
    if "manufacturing_year" in data and data["manufacturing_year"]:
        vehicle.manufacturing_year = int(data["manufacturing_year"])

    try:
        db.session.commit()
        return jsonify({"status": "success", "message": "Vehicle updated.", "vehicle": vehicle.to_dict()}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({"status": "error", "message": "Unique constraint conflict."}), 409
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/vehicles/<int:vehicle_id>", methods=["DELETE"])
def delete_vehicle(vehicle_id):
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify({"status": "error", "message": f"Vehicle {vehicle_id} not found."}), 404
    try:
        db.session.delete(vehicle)
        db.session.commit()
        return jsonify({"status": "success", "message": f"Vehicle '{vehicle.registration_number}' deleted."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500


# ==========================================
# Document APIs (Stage 3)
# ==========================================

@app.route("/api/documents", methods=["GET"])
def get_documents():
    """
    GET /api/documents
    Optional query param: ?vehicle_id=<id>
    Returns all documents with vehicle metadata joined and computed expiry_status.
    """
    try:
        vehicle_id = request.args.get("vehicle_id", type=int)
        query = Document.query.order_by(Document.created_at.desc())
        if vehicle_id:
            query = query.filter_by(vehicle_id=vehicle_id)
        documents = query.all()

        def serialize_with_status(doc):
            d = doc.to_dict(include_vehicle=True)
            d["expiry_status"] = get_expiry_status(doc.expiry_date)
            return d

        return jsonify({
            "status": "success",
            "count": len(documents),
            "documents": [serialize_with_status(d) for d in documents]
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/documents/<int:doc_id>", methods=["GET"])
def get_document_by_id(doc_id):
    """GET /api/documents/<id> — includes computed expiry_status."""
    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"status": "error", "message": f"Document {doc_id} not found."}), 404
    d = doc.to_dict(include_vehicle=True)
    d["expiry_status"] = get_expiry_status(doc.expiry_date)
    return jsonify({"status": "success", "document": d}), 200


@app.route("/api/documents", methods=["POST"])
def upload_document():
    """
    POST /api/documents  (multipart/form-data)
    Form fields:
      vehicle_id      - integer (required)
      document_name   - string (required)
      document_type   - one of VALID_DOCUMENT_TYPES (required)
      issue_date      - ISO date string (optional)
      expiry_date     - ISO date string (optional)
      notes           - text (optional)
    File field:
      file            - PDF only (required)
    """
    # ---- Validate required form fields ----
    errors = []

    vehicle_id_raw = request.form.get("vehicle_id", "").strip()
    if not vehicle_id_raw:
        errors.append("vehicle_id is required.")
    else:
        try:
            vehicle_id = int(vehicle_id_raw)
        except ValueError:
            errors.append("vehicle_id must be a valid integer.")
            vehicle_id = None

    document_name = request.form.get("document_name", "").strip()
    if not document_name:
        errors.append("document_name is required.")

    document_type = request.form.get("document_type", "").strip()
    if not document_type:
        errors.append("document_type is required.")
    elif document_type not in VALID_DOCUMENT_TYPES:
        errors.append(f"document_type must be one of: {', '.join(VALID_DOCUMENT_TYPES)}.")

    issue_date = parse_date(request.form.get("issue_date", ""))
    expiry_date = parse_date(request.form.get("expiry_date", ""))
    notes = request.form.get("notes", "").strip() or None

    # ---- Validate file ----
    if "file" not in request.files:
        errors.append("A PDF file must be attached as 'file'.")
    else:
        uploaded_file = request.files["file"]
        if uploaded_file.filename == "":
            errors.append("No file selected.")
        elif not allowed_file(uploaded_file.filename):
            errors.append("Only PDF files are allowed (.pdf extension required).")
        else:
            # MIME type check — read magic bytes
            if not validate_pdf_mime(uploaded_file):
                errors.append("File content does not match PDF format (invalid magic bytes).")
            else:
                # File size check (belt-and-suspenders; Flask MAX_CONTENT_LENGTH also enforces)
                uploaded_file.seek(0, 2)
                file_size = uploaded_file.tell()
                uploaded_file.seek(0)
                if file_size > MAX_FILE_SIZE_BYTES:
                    errors.append(f"File size exceeds maximum allowed {MAX_FILE_SIZE_MB}MB.")

    if errors:
        return jsonify({"status": "error", "message": "Validation failed.", "errors": errors}), 400

    # ---- Verify vehicle exists ----
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        return jsonify({"status": "error", "message": f"Vehicle with ID {vehicle_id} does not exist."}), 404

    # ---- Generate unique stored filename ----
    original_filename = secure_filename(uploaded_file.filename)
    unique_prefix = uuid.uuid4().hex
    stored_filename = f"{unique_prefix}_{original_filename}"
    relative_path = os.path.join("uploads", stored_filename)
    absolute_path = os.path.join(UPLOAD_FOLDER, stored_filename)

    logging.info(
        "Upload request: original=%s stored=%s upload_dir=%s",
        original_filename, stored_filename, UPLOAD_FOLDER,
    )

    try:
        uploaded_file.save(absolute_path)
    except Exception as e:
        logging.error("File save failed: %s → %s", absolute_path, e)
        return jsonify({"status": "error", "message": "Failed to save file to server."}), 500

    # ---- Verify file was actually written with non-zero size ----
    if not os.path.exists(absolute_path):
        logging.error("File not found after save: %s", absolute_path)
        return jsonify({"status": "error", "message": "File save appeared to succeed but file is missing."}), 500
    saved_size = os.path.getsize(absolute_path)
    if saved_size == 0:
        os.remove(absolute_path)
        logging.error("File saved as zero bytes: %s", absolute_path)
        return jsonify({"status": "error", "message": "Uploaded file was saved as empty — upload aborted."}), 500
    logging.info("File saved successfully: %s (%d bytes)", absolute_path, saved_size)

    # ---- Persist metadata to PostgreSQL ----
    try:
        document = Document(
            vehicle_id=vehicle_id,
            document_name=document_name,
            document_type=document_type,
            file_name=stored_filename,
            file_path=relative_path,
            issue_date=issue_date,
            expiry_date=expiry_date,
            notes=notes,
        )
        db.session.add(document)
        db.session.commit()
        logging.info(
            "Document saved to DB: id=%d name=%s vehicle_id=%d",
            document.id, document.document_name, document.vehicle_id,
        )

        return jsonify({
            "status": "success",
            "message": "Document uploaded and saved to PostgreSQL.",
            "document": document.to_dict(include_vehicle=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        # Clean up saved file if DB insert failed
        if os.path.exists(absolute_path):
            os.remove(absolute_path)
            logging.warning("Rolled back file after DB failure: %s", absolute_path)
        logging.error("DB insert failed for %s: %s", stored_filename, e)
        return jsonify({"status": "error", "message": "Database error — upload rolled back."}), 500


@app.route("/api/documents/<int:doc_id>/download", methods=["GET"])
def download_document(doc_id):
    """
    GET /api/documents/<id>/download
    Streams the PDF file back to the client as an attachment.
    """
    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"status": "error", "message": f"Document {doc_id} not found."}), 404

    # Resolve directly from UPLOAD_FOLDER — safe, volume-aware
    absolute_path = os.path.join(UPLOAD_FOLDER, doc.file_name)
    # Prevent path traversal
    if not os.path.abspath(absolute_path).startswith(os.path.abspath(UPLOAD_FOLDER)):
        return jsonify({"status": "error", "message": "Invalid file path."}), 400

    if not os.path.exists(absolute_path):
        logging.warning("Download requested but file missing: %s (doc_id=%d)", absolute_path, doc_id)
        return jsonify({"status": "error", "message": "File not found on server. It may have been removed."}), 404

    return send_file(
        absolute_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{doc.document_name}.pdf",
    )


@app.route("/api/documents/<int:doc_id>/view", methods=["GET"])
def view_document(doc_id):
    """
    GET /api/documents/<id>/view
    Streams the PDF inline (for in-browser viewing).
    """
    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"status": "error", "message": f"Document {doc_id} not found."}), 404

    # Resolve directly from UPLOAD_FOLDER — safe, volume-aware
    absolute_path = os.path.join(UPLOAD_FOLDER, doc.file_name)
    # Prevent path traversal
    if not os.path.abspath(absolute_path).startswith(os.path.abspath(UPLOAD_FOLDER)):
        return jsonify({"status": "error", "message": "Invalid file path."}), 400

    if not os.path.exists(absolute_path):
        logging.warning("View requested but file missing: %s (doc_id=%d)", absolute_path, doc_id)
        return jsonify({"status": "error", "message": "File not found on server."}), 404

    return send_file(
        absolute_path,
        mimetype="application/pdf",
        as_attachment=False,
    )


@app.route("/api/documents/<int:doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    """DELETE /api/documents/<id> — deletes DB record and physical file."""
    doc = db.session.get(Document, doc_id)
    if not doc:
        return jsonify({"status": "error", "message": f"Document {doc_id} not found."}), 404

    # Resolve directly from UPLOAD_FOLDER
    absolute_path = os.path.join(UPLOAD_FOLDER, doc.file_name)

    try:
        db.session.delete(doc)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Failed to delete record: {str(e)}"}), 500

    # Delete physical file (best-effort; record is already gone)
    if os.path.exists(absolute_path):
        try:
            os.remove(absolute_path)
            logging.info("Deleted file: %s", absolute_path)
        except OSError as e:
            logging.warning("Could not delete file %s: %s", absolute_path, e)

    return jsonify({
        "status": "success",
        "message": f"Document '{doc.document_name}' deleted successfully."
    }), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    print(f"Starting VehicleVault Backend on http://localhost:{port}")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    app.run(host="0.0.0.0", port=port, debug=debug)
