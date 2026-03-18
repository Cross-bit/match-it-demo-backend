# =============================================
# DESCRIPTION
# =============================================
# Contains definitions for custom database exceptions interface.
#
#

class DatabaseError(Exception):
    """Base class for all DB-related errors."""
    pass

class DatabaseConnectionError(DatabaseError):
    """Raised when the database cannot be reached."""

class DatabaseQueryError(DatabaseError):
    """Raised for errors in executing queries."""