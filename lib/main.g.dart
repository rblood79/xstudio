// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'main.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$WidgetConfigImpl _$$WidgetConfigImplFromJson(Map<String, dynamic> json) =>
    _$WidgetConfigImpl(
      type: json['type'] as String,
      properties: json['properties'] as Map<String, dynamic>,
      size: (json['size'] as Map<String, dynamic>?)?.map(
            (k, e) => MapEntry(k, (e as num).toDouble()),
          ) ??
          const <String, double>{'width': 100.0, 'height': 40.0},
      position: (json['position'] as Map<String, dynamic>?)?.map(
            (k, e) => MapEntry(k, (e as num).toDouble()),
          ) ??
          const <String, double>{'x': 0.0, 'y': 0.0},
    );

Map<String, dynamic> _$$WidgetConfigImplToJson(_$WidgetConfigImpl instance) =>
    <String, dynamic>{
      'type': instance.type,
      'properties': instance.properties,
      'size': instance.size,
      'position': instance.position,
    };
