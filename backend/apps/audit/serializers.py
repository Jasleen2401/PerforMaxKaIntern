from rest_framework import serializers
from apps.audit.models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source='actor.username', read_only=True)

    class Meta:
        model = AuditLog
        fields = ('id', 'actor', 'actor_name', 'action', 'entity_type', 'entity_id', 'metadata', 'ip_address', 'timestamp')
        read_only_fields = ('id', 'actor', 'action', 'entity_type', 'entity_id', 'metadata', 'ip_address', 'timestamp')
