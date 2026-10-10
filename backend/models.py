from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

VALID_DOCUMENT_TYPES = [
    "RC",
    "Insurance",
    "PUC",
    "Driving License",
    "Service Record",
    "Pollution Certificate",
    "Other",
]


class Vehicle(db.Model):
    __tablename__ = "vehicles"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    owner_name = db.Column(db.String(150), nullable=False)
    registration_number = db.Column(db.String(64), unique=True, nullable=False, index=True)
    manufacturer = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    vehicle_type = db.Column(db.String(50), nullable=False)
    manufacturing_year = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationship: one vehicle → many documents
    documents = db.relationship(
        "Document",
        back_populates="vehicle",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "owner_name": self.owner_name,
            "registration_number": self.registration_number,
            "manufacturer": self.manufacturer,
            "model": self.model,
            "vehicle_type": self.vehicle_type,
            "manufacturing_year": self.manufacturing_year,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    vehicle_id = db.Column(
        db.Integer,
        db.ForeignKey("vehicles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_name = db.Column(db.String(200), nullable=False)
    document_type = db.Column(db.String(50), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)   # stored filename on disk (uuid-based)
    file_path = db.Column(db.String(512), nullable=False)   # relative path under uploads/
    issue_date = db.Column(db.Date, nullable=True)
    expiry_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Back-reference to vehicle
    vehicle = db.relationship("Vehicle", back_populates="documents")

    def to_dict(self, include_vehicle=True):
        data = {
            "id": self.id,
            "vehicle_id": self.vehicle_id,
            "document_name": self.document_name,
            "document_type": self.document_type,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "issue_date": self.issue_date.isoformat() if self.issue_date else None,
            "expiry_date": self.expiry_date.isoformat() if self.expiry_date else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_vehicle and self.vehicle:
            data["vehicle"] = {
                "id": self.vehicle.id,
                "registration_number": self.vehicle.registration_number,
                "manufacturer": self.vehicle.manufacturer,
                "model": self.vehicle.model,
                "owner_name": self.vehicle.owner_name,
            }
        return data
