# schemas.py — data model for Backlot (film & TV production studio management).
#
# Where stories get made. The slate (Production) is PUBLIC — anyone can browse the
# studio's roster of films and series. Cast & crew (Person), the shooting schedule
# (Scene), locations (ShootLocation) and the call-sheet (Assignment) live behind the
# studio console. Assignment is OWNER-SCOPED to the talent's email so a crew/cast
# member sees only their own call sheet. Every lifecycle field is a renamed
# `<x>_state` enum (NEVER `status`/`state`). Namespace literal "backlot" on each.

NS = "backlot"

GENRES = ["Drama", "Comedy", "Action", "Thriller", "Sci-Fi", "Documentary", "Horror", "Romance"]
FORMATS = ["Feature", "Series", "Short", "Commercial"]
PROD_STATES = ["development", "pre_production", "production", "post_production", "released", "on_hold"]
ROLE_TYPES = ["Director", "Actor", "Producer", "Writer", "Cinematographer", "Editor", "Crew"]
SCENE_STATES = ["not_scheduled", "scheduled", "shot", "needs_reshoot"]
LOCATION_STATES = ["scouting", "secured", "released"]
ASSIGNMENT_STATES = ["offered", "confirmed", "declined", "wrapped"]

# A film or series on the studio's slate. PUBLIC — the showcase ("The Slate").
Production = {
    "schema_type": "object", "name": "Production", "namespace": "backlot", "parent_type": "tenant",
    "description": "A film or series on the studio slate — genre, format, stage, director and logline.",
    "attributes": [
        {"name": "title", "type": "string", "mandatory": True},
        {"name": "genre", "type": "string", "values": GENRES},
        {"name": "format", "type": "string", "values": FORMATS},
        {"name": "prod_state", "type": "string", "mandatory": True, "values": PROD_STATES},
        {"name": "director_name", "type": "string"},
        {"name": "logline", "type": "text"},
        {"name": "budget", "type": "float"},
        {"name": "start_date", "type": "date"},
        {"name": "wrap_date", "type": "date"},
        {"name": "poster", "type": "Image"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A member of the cast & crew roster.
Person = {
    "schema_type": "object", "name": "Person", "namespace": "backlot", "parent_type": "tenant",
    "description": "A member of the cast & crew roster — role, department, contact, day rate and agency.",
    "attributes": [
        {"name": "full_name", "type": "string", "mandatory": True},
        {"name": "role_type", "type": "string", "values": ROLE_TYPES},
        {"name": "department", "type": "string"},
        {"name": "email", "type": "string"},
        {"name": "phone", "type": "string"},
        {"name": "photo", "type": "Image"},
        {"name": "day_rate", "type": "float"},
        {"name": "agency", "type": "string"},
        {"name": "sort_order", "type": "integer"},
    ],
}

# A scene on the shooting schedule / strip board.
Scene = {
    "schema_type": "object", "name": "Scene", "namespace": "backlot", "parent_type": "tenant",
    "description": "A scene on the shooting schedule — INT/EXT, day/night, page count and shoot date.",
    "attributes": [
        {"name": "scene_number", "type": "string"},
        {"name": "production_title", "type": "string"},
        {"name": "location_name", "type": "string"},
        {"name": "scene_state", "type": "string", "mandatory": True, "values": SCENE_STATES},
        {"name": "shoot_date", "type": "datetime"},
        {"name": "int_ext", "type": "string", "values": ["INT", "EXT"]},
        {"name": "time_of_day", "type": "string", "values": ["DAY", "NIGHT", "DUSK", "DAWN"]},
        {"name": "pages", "type": "float"},
        {"name": "description", "type": "text"},
        {"name": "cast_list", "type": "string"},
    ],
}

# A shooting location being scouted or secured.
ShootLocation = {
    "schema_type": "object", "name": "ShootLocation", "namespace": "backlot", "parent_type": "tenant",
    "description": "A shooting location — type, day rate, permit status and scouting lifecycle.",
    "attributes": [
        {"name": "name", "type": "string", "mandatory": True},
        {"name": "address", "type": "string"},
        {"name": "location_type", "type": "string"},
        {"name": "day_rate", "type": "float"},
        {"name": "location_state", "type": "string", "mandatory": True, "values": LOCATION_STATES},
        {"name": "permits", "type": "boolean"},
        {"name": "image", "type": "Image"},
    ],
}

# A role offered to a person — the talent's call sheet. OWNER-SCOPED to owner_username
# (the talent's email) so a crew/cast member sees and confirms only their own roles.
Assignment = {
    "schema_type": "object", "name": "Assignment", "namespace": "backlot", "parent_type": "tenant",
    "description": "A role offered to a person on a production — call time, location, rate and confirmation state.",
    "attributes": [
        {"name": "production_title", "type": "string"},
        {"name": "person_name", "type": "string"},
        {"name": "person_email", "type": "string"},
        {"name": "role_type", "type": "string", "values": ROLE_TYPES},
        {"name": "character_name", "type": "string"},
        {"name": "assignment_state", "type": "string", "mandatory": True, "values": ASSIGNMENT_STATES},
        {"name": "call_time", "type": "datetime"},
        {"name": "location_name", "type": "string"},
        {"name": "rate", "type": "float"},
        {"name": "owner_username", "type": "string"},
    ],
}

ALL_SCHEMAS = [Production, Person, Scene, ShootLocation, Assignment]
PUBLIC_SCHEMAS = ["production"]
SUPERO_APP_NAMESPACE = "backlot"
