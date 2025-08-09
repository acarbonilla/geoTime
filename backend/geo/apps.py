from django.apps import AppConfig


class GeoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'geo'

    def ready(self):
        """
        Import and register signals when the app is ready.
        """
        import geo.signals
