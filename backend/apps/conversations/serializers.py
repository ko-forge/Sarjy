from rest_framework import serializers


class MessageInputSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, trim_whitespace=True, allow_blank=False)
    model = serializers.CharField(max_length=80, required=False, allow_blank=True, trim_whitespace=True)
