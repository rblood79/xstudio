import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'main.freezed.dart';
part 'main.g.dart';

/// 모델 클래스
@freezed
class WidgetConfig with _$WidgetConfig {
  const factory WidgetConfig({
    required String type,
    required Map<String, dynamic> properties,
    @Default(<String, double>{'width': 100.0, 'height': 40.0})
        Map<String, double> size,
    @Default(<String, double>{'x': 0.0, 'y': 0.0})
        Map<String, double> position,
  }) = _WidgetConfig;

  /// JSON 직렬화 기능
  factory WidgetConfig.fromJson(Map<String, dynamic> json) =>
      _$WidgetConfigFromJson(json);
}

/// 캔버스에 추가된 위젯 목록 상태 (Undo/Redo 기능 포함)
final canvasProvider =
    StateNotifierProvider<CanvasNotifier, List<WidgetConfig>>(
        (ref) => CanvasNotifier());

/// 선택된 위젯 상태
final selectedWidgetProvider =
    StateNotifierProvider<SelectedWidgetNotifier, WidgetConfig?>(
        (ref) => SelectedWidgetNotifier());

class CanvasNotifier extends StateNotifier<List<WidgetConfig>> {
  CanvasNotifier() : super([]);

  final List<List<WidgetConfig>> _undoStack = [];
  final List<List<WidgetConfig>> _redoStack = [];

  void _saveStateForUndo() {
    _undoStack.add(List.from(state));
    _redoStack.clear();
  }

  void addWidget(WidgetConfig config) {
    _saveStateForUndo();
    state = [...state, config];
  }

  void updateWidget(int index, WidgetConfig newConfig) {
    _saveStateForUndo();
    state = [
      for (int i = 0; i < state.length; i++)
        if (i == index) newConfig else state[i]
    ];
  }

  void removeWidget(int index) {
    _saveStateForUndo();
    state =
        state.where((element) => state.indexOf(element) != index).toList();
  }

  void undo() {
    if (_undoStack.isNotEmpty) {
      _redoStack.add(List.from(state));
      state = _undoStack.removeLast();
    }
  }

  void redo() {
    if (_redoStack.isNotEmpty) {
      _undoStack.add(List.from(state));
      state = _redoStack.removeLast();
    }
  }
  
  // 추가: 상태 할당용 메서드
  void setWidgets(List<WidgetConfig> newWidgets) {
    state = newWidgets;
  }
}

class SelectedWidgetNotifier extends StateNotifier<WidgetConfig?> {
  int? selectedIndex;
  SelectedWidgetNotifier() : super(null);

  /// 위젯 선택 시 위젯 정보와 인덱스 저장
  void select(WidgetConfig config, int index) {
    state = config;
    selectedIndex = index;
  }

  /// 속성 변경 (CanvasProvider에도 반영)
  void updateProperty(String key, dynamic value, WidgetRef ref) {
    if (state == null || selectedIndex == null) return;
    final newConfig = state!.copyWith(
      properties: {...state!.properties, key: value},
    );
    state = newConfig;
    ref.read(canvasProvider.notifier).updateWidget(selectedIndex!, newConfig);
  }

  /// 위치 변경
  void updatePosition(String key, double value, WidgetRef ref) {
    if (state == null || selectedIndex == null) return;
    final newPosition = Map<String, double>.from(state!.position);
    newPosition[key] = value;
    final newConfig = state!.copyWith(position: newPosition);
    state = newConfig;
    ref.read(canvasProvider.notifier).updateWidget(selectedIndex!, newConfig);
  }
  
  // 추가: 상태 클리어 메서드
  void clear() {
    state = null;
    selectedIndex = null;
  }
}

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Web Builder',
      theme: ThemeData.light(useMaterial3: true),
      darkTheme: ThemeData.dark(useMaterial3: true),
      home: const BuilderScreen(),
    );
  }
}

class BuilderScreen extends ConsumerWidget {
  const BuilderScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 48, // AppBar 높이를 48로 변경
        automaticallyImplyLeading: false, // 기본 왼쪽 아이콘 제거
        titleSpacing: 0,
        title: Row(
          children: [
            IconButton(
              icon: const Icon(Icons.undo),
              tooltip: 'Undo',
              onPressed: () {
                ref.read(canvasProvider.notifier).undo();
                ref.read(selectedWidgetProvider.notifier).clear();
              },
            ),
            IconButton(
              icon: const Icon(Icons.redo),
              tooltip: 'Redo',
              onPressed: () {
                ref.read(canvasProvider.notifier).redo();
                ref.read(selectedWidgetProvider.notifier).clear();
              },
            ),
            IconButton(
              icon: const Icon(Icons.remove_red_eye),
              tooltip: 'Preview',
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const PreviewScreen()),
              ),
            ),
            const SizedBox(width: 8),
            const Text('Web Builder'),
          ],
        ),
      ),
      body: Stack(
        children: [
          Row(
            children: const [
              SidebarMenu(),
              WidgetPalette(),
              CanvasArea(),
              PreviewPanel(),
              PropertyEditor(),
            ],
          ),
          // 프레임 레이트 모니터를 오른쪽 상단에 오버레이
          const FrameRateMonitor(),
        ],
      ),
    );
  }
}

/// SidebarMenu: 왼쪽 고정 너비 48
class SidebarMenu extends StatelessWidget {
  const SidebarMenu({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        border: Border.all(color: const Color(0xFFFF0000), width: 1),
      ),
      child: const Center(child: Text('Menu')),
    );
  }
}

/// 위젯팔레트: 고정 너비 48
class WidgetPalette extends StatelessWidget {
  const WidgetPalette({super.key});
  final List<Map<String, dynamic>> widgets = const [
    {
      'type': 'Text',
      'icon': Icons.text_fields,
      'config': WidgetConfig(
        type: 'Text',
        properties: {'text': 'New Text', 'fontSize': 16.0, 'color': '#000000'},
      )
    },
    {
      'type': 'Button',
      'icon': Icons.smart_button,
      'config': WidgetConfig(
        type: 'Button',
        properties: {
          'text': 'Click Me',
          'backgroundColor': '#2196F3',
          'textColor': '#FFFFFF',
          'elevation': 2.0,
          'borderRadius': 4.0,
        },
      )
    },
    {
      'type': 'Select',
      'icon': Icons.arrow_drop_down_circle,
      'config': WidgetConfig(
        type: 'Select',
        properties: {
          'options': ['Option 1', 'Option 2'],
          'hint': 'Select...'
        },
      )
    },
  ];
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 48,
      decoration: BoxDecoration(
        color: Colors.grey[100],
        border: Border.all(color: const Color(0xFFFF0000), width: 1),
      ),
      child: ListView.builder(
        itemCount: widgets.length,
        itemBuilder: (context, index) => Draggable<WidgetConfig>(
          data: widgets[index]['config'] as WidgetConfig,
          feedback: Container(
            width: 48,
            height: 40,
            // 변경: Colors.white.withOpacity(0.9) 대신 Color.fromRGBO 사용
            color: Color.fromRGBO(255, 255, 255, 0.9),
            child: Icon(
              widgets[index]['icon'] as IconData,
              color: Colors.blue,
            ),
          ),
          child: IconButton(
            icon: Icon(widgets[index]['icon'] as IconData),
            onPressed: () {},
          ),
        ),
      ),
    );
  }
}

/// 캔버스영역: 고정 너비 240
class CanvasArea extends ConsumerWidget {
  const CanvasArea({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final widgets = ref.watch(canvasProvider);
    final selected = ref.watch(selectedWidgetProvider);
    return Container(
      width: 240,
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFFF0000), width: 1),
      ),
      child: DragTarget<WidgetConfig>(
        onAcceptWithDetails: (details) {
          ref.read(canvasProvider.notifier).addWidget(details.data);
        },
        builder: (context, candidateData, rejectedData) {
          return ReorderableListView(
            padding: const EdgeInsets.all(16),
            onReorder: (oldIndex, newIndex) {
              if (newIndex > oldIndex) newIndex -= 1;
              final item = widgets[oldIndex];
              final List<WidgetConfig> newList = List.from(widgets);
              newList.removeAt(oldIndex);
              newList.insert(newIndex, item);
              ref.read(canvasProvider.notifier).setWidgets(newList);
            },
            children: [
              for (int i = 0; i < widgets.length; i++)
                GestureDetector(
                  key: ValueKey(i),
                  onTap: () {
                    ref
                        .read(selectedWidgetProvider.notifier)
                        .select(widgets[i], i);
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: selected == widgets[i]
                            ? Colors.blue
                            : Colors.transparent,
                        width: 1,
                      ),
                    ),
                    child: buildWidget(widgets[i]),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget buildWidget(WidgetConfig config) {
    switch (config.type) {
      case 'Text':
        return Text(
          config.properties['text'],
          style: TextStyle(
            fontSize: (config.properties['fontSize'] as num?)?.toDouble() ?? 16.0,
            color: _parseColor(config.properties['color']),
          ),
        );
      case 'Button':
        return ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: _parseColor(config.properties['backgroundColor']),
            foregroundColor: _parseColor(config.properties['textColor']),
            elevation: (config.properties['elevation'] as num?)?.toDouble() ?? 2.0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(
                (config.properties['borderRadius'] as num?)?.toDouble() ?? 4.0,
              ),
            ),
          ),
          onPressed: () {},
          child: Text(config.properties['text']),
        );
      case 'Select':
        return DropdownButtonFormField<String>(
          items: (config.properties['options'] as List<dynamic>)
              .map(
                (e) => DropdownMenuItem(
                  value: e.toString(),
                  child: Text(e.toString()),
                ),
              )
              .toList(),
          hint: Text(config.properties['hint']),
          onChanged: (value) {},
        );
      default:
        return const Placeholder();
    }
  }

  Color _parseColor(dynamic colorStr) {
    if (colorStr is String && colorStr.startsWith('#')) {
      return Color(
        int.parse(colorStr.substring(1, 7), radix: 16) + 0xFF000000,
      );
    }
    return Colors.black;
  }
}

/// 프리뷰패널: 가변 너비 (Expanded 사용)
class PreviewPanel extends ConsumerWidget {
  const PreviewPanel({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final widgets = ref.watch(canvasProvider);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFFF0000), width: 1),
        ),
        child: InteractiveViewer(
          boundaryMargin: const EdgeInsets.all(20),
          minScale: 0.1,
          maxScale: 4.0,
          child: Stack(
            children: widgets
                .map((config) => Positioned(
                      left: config.position['x']!,
                      top: config.position['y']!,
                      child: SizedBox(
                        width: config.size['width']!,
                        height: config.size['height']!,
                        child: buildPreviewWidget(config),
                      ),
                    ))
                .toList(),
          ),
        ),
      ),
    );
  }

  Widget buildPreviewWidget(WidgetConfig config) {
    switch (config.type) {
      case 'Text':
        return Text(config.properties['text']);
      case 'Button':
        return ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: _parseColor(config.properties['backgroundColor']),
            foregroundColor: _parseColor(config.properties['textColor']),
            elevation: (config.properties['elevation'] as num?)?.toDouble() ?? 2.0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(
                (config.properties['borderRadius'] as num?)?.toDouble() ?? 4.0,
              ),
            ),
          ),
          onPressed: () {},
          child: Text(config.properties['text']),
        );
      case 'Select':
        return DropdownButton<String>(
          items: (config.properties['options'] as List<dynamic>)
              .map(
                (e) => DropdownMenuItem(
                  value: e.toString(),
                  child: Text(e.toString()),
                ),
              )
              .toList(),
          hint: Text(config.properties['hint']),
          onChanged: (value) {},
        );
      default:
        return const Placeholder();
    }
  }

  Color _parseColor(dynamic colorStr) {
    if (colorStr is String && colorStr.startsWith('#')) {
      return Color(
        int.parse(colorStr.substring(1, 7), radix: 16) + 0xFF000000,
      );
    }
    return Colors.black;
  }
}

/// 프로퍼티에디터: 고정 너비 240
class PropertyEditor extends ConsumerWidget {
  const PropertyEditor({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(selectedWidgetProvider);
    return Container(
      width: 240,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFFF0000), width: 1),
      ),
      child: selected == null
          ? const Center(child: Text('위젯을 선택하세요'))
          : ListView(
              children: [
                Text(
                  '${selected.type} 속성',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 16),
                ..._buildPropertyFields(selected, ref),
              ],
            ),
    );
  }

  List<Widget> _buildPropertyFields(WidgetConfig config, WidgetRef ref) {
    List<Widget> fields = [];
    switch (config.type) {
      case 'Text':
        fields = [
          _buildTextField('text', '내용', ref),
          _buildNumberField('fontSize', '글자 크기', ref),
          _buildColorField('color', '색상', ref),
        ];
        break;
      case 'Button':
        fields = [
          _buildTextField('text', '버튼 텍스트', ref),
          _buildColorField('backgroundColor', '배경색', ref),
          _buildColorField('textColor', '글자색', ref),
          _buildNumberField('elevation', '버튼 그림자', ref),
          _buildNumberField('borderRadius', '모서리 둥글기', ref),
        ];
        break;
      case 'Select':
        fields = [
          _buildTextField('hint', '힌트 텍스트', ref),
          _buildOptionsEditor(config, ref),
        ];
        break;
      default:
        fields = [const Text('지원되지 않는 위젯 유형')];
    }
    // 위치 조정 필드 (모든 위젯 공통)
    fields.add(const Divider());
    fields.add(const Text(
      '위치 조정',
      style: TextStyle(fontWeight: FontWeight.bold),
    ));
    fields.add(_buildPositionField('x', 'X 좌표', ref));
    fields.add(_buildPositionField('y', 'Y 좌표', ref));
    return fields;
  }

  Widget _buildTextField(String key, String label, WidgetRef ref) {
    return TextFormField(
      decoration: InputDecoration(labelText: label),
      initialValue:
          ref.watch(selectedWidgetProvider)?.properties[key]?.toString(),
      onChanged: (value) {
        ref
            .read(selectedWidgetProvider.notifier)
            .updateProperty(key, value, ref);
      },
    );
  }

  Widget _buildNumberField(String key, String label, WidgetRef ref) {
    return TextFormField(
      keyboardType: TextInputType.number,
      decoration: InputDecoration(labelText: label),
      initialValue:
          ref.watch(selectedWidgetProvider)?.properties[key]?.toString(),
      onChanged: (value) {
        double? number = double.tryParse(value);
        if (number != null) {
          ref
              .read(selectedWidgetProvider.notifier)
              .updateProperty(key, number, ref);
        }
      },
    );
  }

  Widget _buildColorField(String key, String label, WidgetRef ref) {
    final colorStr =
        ref.watch(selectedWidgetProvider)?.properties[key]?.toString() ??
            '#000000';
    return ListTile(
      title: Text(label),
      trailing: Container(
        width: 24,
        height: 24,
        color: _parseColor(colorStr),
      ),
    );
  }

  Color _parseColor(String colorStr) {
    if (colorStr.startsWith('#')) {
      return Color(
        int.parse(colorStr.substring(1, 7), radix: 16) + 0xFF000000,
      );
    }
    return Colors.black;
  }

  Widget _buildOptionsEditor(WidgetConfig config, WidgetRef ref) {
    final options = config.properties['options'] as List<dynamic>? ?? [];
    return Column(
      children: [
        ...options.map(
          (option) => ListTile(
            title: Text(option.toString()),
            trailing: IconButton(
              icon: const Icon(Icons.delete),
              onPressed: () {
                final newOptions = List<String>.from(
                    options.map((e) => e.toString()));
                newOptions.remove(option.toString());
                ref
                    .read(selectedWidgetProvider.notifier)
                    .updateProperty('options', newOptions, ref);
              },
            ),
          ),
        ),
        TextButton(
          onPressed: () {
            final newOptions = List<String>.from(
                options.map((e) => e.toString()));
            newOptions.add('New Option');
            ref
                .read(selectedWidgetProvider.notifier)
                .updateProperty('options', newOptions, ref);
          },
          child: const Text('옵션 추가'),
        ),
      ],
    );
  }

  Widget _buildPositionField(String key, String label, WidgetRef ref) {
    final selected = ref.watch(selectedWidgetProvider);
    final initialValue = selected?.position[key]?.toString() ?? '0';
    return TextFormField(
      keyboardType: TextInputType.number,
      decoration: InputDecoration(labelText: label),
      initialValue: initialValue,
      onChanged: (value) {
        double? number = double.tryParse(value);
        if (number != null) {
          ref
              .read(selectedWidgetProvider.notifier)
              .updatePosition(key, number, ref);
        }
      },
    );
  }
}

/// PreviewScreen: 전체 화면 프리뷰를 제공하는 클래스
class PreviewScreen extends ConsumerWidget {
  const PreviewScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final widgets = ref.watch(canvasProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Preview'),
      ),
      body: Center(
        child: Container(
          width: 360,
          height: 640,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.black38, width: 16),
            borderRadius: BorderRadius.circular(32),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              children: widgets
                  .map((config) => Positioned(
                        left: config.position['x']!,
                        top: config.position['y']!,
                        child: SizedBox(
                          width: config.size['width']!,
                          height: config.size['height']!,
                          child: _buildPreviewWidget(config),
                        ),
                      ))
                  .toList(),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPreviewWidget(WidgetConfig config) {
    switch (config.type) {
      case 'Text':
        return Text(config.properties['text']);
      case 'Button':
        return ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: _parseColor(config.properties['backgroundColor']),
            foregroundColor: _parseColor(config.properties['textColor']),
            elevation: (config.properties['elevation'] as num?)?.toDouble() ?? 2.0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(
                (config.properties['borderRadius'] as num?)?.toDouble() ?? 4.0,
              ),
            ),
          ),
          onPressed: () {},
          child: Text(config.properties['text']),
        );
      case 'Select':
        return DropdownButton<String>(
          items: (config.properties['options'] as List<dynamic>)
              .map(
                (e) => DropdownMenuItem(
                  value: e.toString(),
                  child: Text(e.toString()),
                ),
              )
              .toList(),
          hint: Text(config.properties['hint']),
          onChanged: (value) {},
        );
      default:
        return const Placeholder();
    }
  }

  Color _parseColor(dynamic colorStr) {
    if (colorStr is String && colorStr.startsWith('#')) {
      return Color(
        int.parse(colorStr.substring(1, 7), radix: 16) + 0xFF000000,
      );
    }
    return Colors.black;
  }
}

/// FrameRateMonitor 위젯 (프레임 레이트 표시)
class FrameRateMonitor extends StatefulWidget {
  const FrameRateMonitor({super.key});

  @override
  _FrameRateMonitorState createState() => _FrameRateMonitorState();
}

class _FrameRateMonitorState extends State<FrameRateMonitor>
    with WidgetsBindingObserver {
  Ticker? _ticker;
  int _frameCount = 0;
  int _lastFrameTime = 0;
  double _fps = 0.0;
  final List<double> _fpsHistory = [];
  final int _maxHistoryLength = 30;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ticker = Ticker(_onTick)..start();
  }

  void _onTick(Duration duration) {
    int currentTime = duration.inMilliseconds;
    _frameCount++;

    int elapsed = currentTime - _lastFrameTime;
    // 500ms 간격으로 FPS 계산
    if (elapsed >= 500) {
      setState(() {
        _fps = (_frameCount / elapsed) * 1000;
        _frameCount = 0;
        _lastFrameTime = currentTime;

        if (_fpsHistory.length >= _maxHistoryLength) {
          _fpsHistory.removeAt(0);
        }
        _fpsHistory.add(_fps);
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 8,
      right: 8,
      child: Container(
        padding: const EdgeInsets.all(8),
        color: Colors.black54,
        child: Text(
          '${_fps.toStringAsFixed(1)} FPS',
          style: const TextStyle(color: Colors.white, fontSize: 12),
        ),
      ),
    );
  }
}
