# schemas.py — data model for PulseFit (multi-location boutique fitness brand)
#
# Public discovery (Club, Trainer, ClassOffering are PUBLIC) + owner-scoped member
# records (Member, ClassBooking). Lifecycle fields are renamed *_state enums (NEVER
# `status`/`state`) so non-admin writes aren't stripped → 422. Owner-scoping is by
# `owner_username` ($user.name), never by a *_uuid.

NS = "pulsefit"

SPECIALTIES = ["Strength", "HIIT", "Yoga", "Pilates", "Spin", "Boxing", "Mobility", "Nutrition"]
INTENSITIES = ["Low", "Medium", "High"]
PLANS = ["Day Pass", "Basic", "Premium", "Elite"]

# A club / studio location. PUBLIC — anyone can browse locations.
Club = {
    "schema_type": "object", "name": "Club", "namespace": "pulsefit", "parent_type": "tenant",
    "description": "A PulseFit club location with neighborhood, amenities, hours and photo.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "address", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "neighborhood", "type": "string"},
        {"name": "amenities", "type": "text"},
        {"name": "hours", "type": "string"},
        {"name": "image", "type": "Image"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A coach / trainer. PUBLIC — browse the team.
Trainer = {
    "schema_type": "object", "name": "Trainer", "namespace": "pulsefit", "parent_type": "tenant",
    "description": "A PulseFit coach with specialty, bio, certifications and home club.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "specialty", "type": "string", "values": SPECIALTIES},
        {"name": "bio", "type": "text"},
        {"name": "certifications", "type": "string"},
        {"name": "club_name", "type": "string"},
        {"name": "photo", "type": "Image"},
        {"name": "rating", "type": "float"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A scheduled class. PUBLIC — browse and (members) book.
ClassOffering = {
    "schema_type": "object", "name": "ClassOffering", "namespace": "pulsefit", "parent_type": "tenant",
    "description": "A scheduled class with category, trainer, club, time slot, capacity and intensity.",
    "attributes": [
        {"name": "class_name", "type": "string", "mandatory": True},
        {"name": "category", "type": "string", "values": SPECIALTIES},
        {"name": "trainer_name", "type": "string"},
        {"name": "club_name", "type": "string"},
        {"name": "day_time", "type": "string"},
        {"name": "duration_min", "type": "integer"},
        {"name": "capacity", "type": "integer"},
        {"name": "spots_left", "type": "integer"},
        {"name": "intensity", "type": "string", "values": INTENSITIES},
        {"name": "image", "type": "Image"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A member profile. Owner-scoped — each member sees only their own.
Member = {
    "schema_type": "object", "name": "Member", "namespace": "pulsefit", "parent_type": "tenant",
    "description": "A PulseFit member profile with home club, plan and membership state.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "email", "type": "string", "mandatory": True},
        {"name": "phone", "type": "string"},
        {"name": "home_club", "type": "string"},
        {"name": "plan", "type": "string", "values": PLANS},
        {"name": "member_state", "type": "string", "mandatory": True,
         "values": ["active", "frozen", "cancelled"]},
        {"name": "join_date", "type": "date"},
        {"name": "owner_username", "type": "string"},
        {"name": "user_account_uuid", "type": "string"},
    ],
}

# A class booking. Owner-scoped to the member who booked it.
ClassBooking = {
    "schema_type": "object", "name": "ClassBooking", "namespace": "pulsefit", "parent_type": "tenant",
    "description": "A member's booking for a class with its lifecycle state.",
    "attributes": [
        {"name": "class_name", "type": "string"},
        {"name": "member_name", "type": "string"},
        {"name": "member_email", "type": "string"},
        {"name": "club_name", "type": "string"},
        {"name": "day_time", "type": "string"},
        {"name": "booking_state", "type": "string", "mandatory": True,
         "values": ["booked", "attended", "cancelled", "waitlist"]},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [Club, Trainer, ClassOffering, Member, ClassBooking]
PUBLIC_SCHEMAS = ["club", "class_offering", "trainer"]
SUPERO_APP_NAMESPACE = "pulsefit"
