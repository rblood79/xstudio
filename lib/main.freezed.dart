// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'main.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

WidgetConfig _$WidgetConfigFromJson(Map<String, dynamic> json) {
  return _WidgetConfig.fromJson(json);
}

/// @nodoc
mixin _$WidgetConfig {
  String get type => throw _privateConstructorUsedError;
  Map<String, dynamic> get properties => throw _privateConstructorUsedError;
  Map<String, double> get size => throw _privateConstructorUsedError;
  Map<String, double> get position => throw _privateConstructorUsedError;

  /// Serializes this WidgetConfig to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of WidgetConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $WidgetConfigCopyWith<WidgetConfig> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $WidgetConfigCopyWith<$Res> {
  factory $WidgetConfigCopyWith(
          WidgetConfig value, $Res Function(WidgetConfig) then) =
      _$WidgetConfigCopyWithImpl<$Res, WidgetConfig>;
  @useResult
  $Res call(
      {String type,
      Map<String, dynamic> properties,
      Map<String, double> size,
      Map<String, double> position});
}

/// @nodoc
class _$WidgetConfigCopyWithImpl<$Res, $Val extends WidgetConfig>
    implements $WidgetConfigCopyWith<$Res> {
  _$WidgetConfigCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of WidgetConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? type = null,
    Object? properties = null,
    Object? size = null,
    Object? position = null,
  }) {
    return _then(_value.copyWith(
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      properties: null == properties
          ? _value.properties
          : properties // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
      size: null == size
          ? _value.size
          : size // ignore: cast_nullable_to_non_nullable
              as Map<String, double>,
      position: null == position
          ? _value.position
          : position // ignore: cast_nullable_to_non_nullable
              as Map<String, double>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$WidgetConfigImplCopyWith<$Res>
    implements $WidgetConfigCopyWith<$Res> {
  factory _$$WidgetConfigImplCopyWith(
          _$WidgetConfigImpl value, $Res Function(_$WidgetConfigImpl) then) =
      __$$WidgetConfigImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String type,
      Map<String, dynamic> properties,
      Map<String, double> size,
      Map<String, double> position});
}

/// @nodoc
class __$$WidgetConfigImplCopyWithImpl<$Res>
    extends _$WidgetConfigCopyWithImpl<$Res, _$WidgetConfigImpl>
    implements _$$WidgetConfigImplCopyWith<$Res> {
  __$$WidgetConfigImplCopyWithImpl(
      _$WidgetConfigImpl _value, $Res Function(_$WidgetConfigImpl) _then)
      : super(_value, _then);

  /// Create a copy of WidgetConfig
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? type = null,
    Object? properties = null,
    Object? size = null,
    Object? position = null,
  }) {
    return _then(_$WidgetConfigImpl(
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      properties: null == properties
          ? _value._properties
          : properties // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
      size: null == size
          ? _value._size
          : size // ignore: cast_nullable_to_non_nullable
              as Map<String, double>,
      position: null == position
          ? _value._position
          : position // ignore: cast_nullable_to_non_nullable
              as Map<String, double>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$WidgetConfigImpl implements _WidgetConfig {
  const _$WidgetConfigImpl(
      {required this.type,
      required final Map<String, dynamic> properties,
      final Map<String, double> size = const <String, double>{
        'width': 100.0,
        'height': 40.0
      },
      final Map<String, double> position = const <String, double>{
        'x': 0.0,
        'y': 0.0
      }})
      : _properties = properties,
        _size = size,
        _position = position;

  factory _$WidgetConfigImpl.fromJson(Map<String, dynamic> json) =>
      _$$WidgetConfigImplFromJson(json);

  @override
  final String type;
  final Map<String, dynamic> _properties;
  @override
  Map<String, dynamic> get properties {
    if (_properties is EqualUnmodifiableMapView) return _properties;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_properties);
  }

  final Map<String, double> _size;
  @override
  @JsonKey()
  Map<String, double> get size {
    if (_size is EqualUnmodifiableMapView) return _size;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_size);
  }

  final Map<String, double> _position;
  @override
  @JsonKey()
  Map<String, double> get position {
    if (_position is EqualUnmodifiableMapView) return _position;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_position);
  }

  @override
  String toString() {
    return 'WidgetConfig(type: $type, properties: $properties, size: $size, position: $position)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$WidgetConfigImpl &&
            (identical(other.type, type) || other.type == type) &&
            const DeepCollectionEquality()
                .equals(other._properties, _properties) &&
            const DeepCollectionEquality().equals(other._size, _size) &&
            const DeepCollectionEquality().equals(other._position, _position));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      type,
      const DeepCollectionEquality().hash(_properties),
      const DeepCollectionEquality().hash(_size),
      const DeepCollectionEquality().hash(_position));

  /// Create a copy of WidgetConfig
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$WidgetConfigImplCopyWith<_$WidgetConfigImpl> get copyWith =>
      __$$WidgetConfigImplCopyWithImpl<_$WidgetConfigImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$WidgetConfigImplToJson(
      this,
    );
  }
}

abstract class _WidgetConfig implements WidgetConfig {
  const factory _WidgetConfig(
      {required final String type,
      required final Map<String, dynamic> properties,
      final Map<String, double> size,
      final Map<String, double> position}) = _$WidgetConfigImpl;

  factory _WidgetConfig.fromJson(Map<String, dynamic> json) =
      _$WidgetConfigImpl.fromJson;

  @override
  String get type;
  @override
  Map<String, dynamic> get properties;
  @override
  Map<String, double> get size;
  @override
  Map<String, double> get position;

  /// Create a copy of WidgetConfig
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$WidgetConfigImplCopyWith<_$WidgetConfigImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
