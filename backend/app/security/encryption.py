from cryptography.fernet import Fernet
import base64
import hashlib


def derive_user_key(user_id: str, master_secret: str) -> bytes:
    """Derive per-user encryption key from master secret."""
    key_material = f"{master_secret}:{user_id}".encode()
    key = hashlib.sha256(key_material).digest()
    return base64.urlsafe_b64encode(key)


def encrypt_field(value: str, user_key: bytes) -> str:
    return Fernet(user_key).encrypt(value.encode()).decode()


def decrypt_field(encrypted: str, user_key: bytes) -> str:
    return Fernet(user_key).decrypt(encrypted.encode()).decode()


# Data tier classification
DATA_TIERS = {
    "tier1_public":    ["preferences", "goals", "habits", "social_data"],
    "tier2_private":   ["financial_data", "family_notes", "contact_details"],
    "tier3_sensitive": ["health_records", "medical_notes", "children_data", "therapy_notes"],
}


def get_data_tier(field_type: str) -> str:
    for tier, fields in DATA_TIERS.items():
        if field_type in fields:
            return tier
    return "tier1_public"


def is_cloud_ai_allowed(field_type: str) -> bool:
    return get_data_tier(field_type) != "tier3_sensitive"
