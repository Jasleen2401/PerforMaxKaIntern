from apps.audit.models import AuditLog

class AuditService:
    @staticmethod
    def log(actor, action: str, entity_type: str, entity_id: str = None, metadata: dict = None, ip_address: str = None):
        return AuditLog.objects.create(
            actor=actor if (actor and actor.is_authenticated) else None,
            action=action.upper(),
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            metadata=metadata or {},
            ip_address=ip_address
        )
