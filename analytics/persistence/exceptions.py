class PersistenceError(Exception):
    """Base class for persistence-layer failures."""


class DatabaseConnectionError(PersistenceError):
    """Raised when a database engine or connection cannot be created."""


class InsertionError(PersistenceError):
    """Raised when validated observations cannot be inserted."""


class DuplicateObservationError(InsertionError):
    """Raised when an observation already exists for the same location and date."""


class SchemaValidationError(InsertionError):
    """Raised when a DataFrame does not match the required persistence schema."""
