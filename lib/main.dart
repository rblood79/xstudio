import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:remixicon/remixicon.dart';

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
    final newList = List<WidgetConfig>.from(state);
    newList.removeAt(index);
    state = newList;
  }
  
  // 추가: 위젯의 순서를 드래그로 변경하기 위한 메서드
  void reorderWidget(int oldIndex, int newIndex) {
    _saveStateForUndo();
    final List<WidgetConfig> newList = List.from(state);
    if (newIndex > oldIndex) {
      newIndex -= 1;
    }
    final item = newList.removeAt(oldIndex);
    newList.insert(newIndex, item);
    state = newList;
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
        toolbarHeight: 48, // AppBar 높이 48
        automaticallyImplyLeading: false,
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
              icon: const Icon(Icons.delete),
              tooltip: 'Delete Selected Widget',
              onPressed: () {
                final selectedNotifier =
                    ref.read(selectedWidgetProvider.notifier);
                final selectedIndex = selectedNotifier.selectedIndex;
                if (selectedIndex != null) {
                  ref.read(canvasProvider.notifier).removeWidget(selectedIndex);
                  selectedNotifier.clear();
                }
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
            //const SizedBox(width: 8),
            //const Text('Web Builder'),
          ],
        ),
      ),
      body: Stack(
        children: [
          Row(
            children: const [
              SidebarMenu(),
              WidgetPalette(),
              WidgetTree(),
              LayoutPanel(),
              Expanded(child: PropertyEditor()),
            ],
          ),
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
        color: Colors.white,
        border: Border.all(color: const Color(0xFFFF0000), width: 0.5),
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
      'label': 'Container',
      'icon': Remix.layout_line, // Remixicon에서 layout 관련 아이콘 사용 (예시)
      'config': WidgetConfig(
        type: 'Container',
        properties: {'children': []},
        size: {'width': 200, 'height': 200},
      )
    },
    {
      'label': 'Input',
      'icon': Remix.t_box_line,
      'config': WidgetConfig(
        type: 'Input',
        properties: {'placeholder': 'Enter text...'},
        size: {'width': 100, 'height': 48.0},
      )
    },
    {
      'label': 'Button',
      'icon': Remix.checkbox_blank_line,
      'config': WidgetConfig(
        type: 'Button',
        properties: {'text': 'Button'},
        size: {'width': 100.0, 'height': 48.0},
      )
    },
    {
      'label': 'Select',
      'icon': Remix.dropdown_list,
      'config': WidgetConfig(
        type: 'Select',
        properties: {
          'options': ['Option 1', 'Option 2'],
          'hint': 'Select...'
        },
        size: {'width': 120.0, 'height': 48.0},
      )
    },
    {
      'label': 'Image',
      'icon': Remix.image_line,
      'config': WidgetConfig(
        type: 'Image',
        properties: {'src': 'https://example.com/image.png'},
        size: {'width': 62.0, 'height': 62.0},
      )
    },
    {
      'label': 'Check',
      'icon': Remix.checkbox_line,
      'config': WidgetConfig(
        type: 'Check',
        properties: {'value': false},
        size: {'width': 62.0, 'height': 62.0},
      )
    },
    {
      'label': 'Radio',
      'icon': Remix.radio_button_line,
      'config': WidgetConfig(
        type: 'Radio',
        properties: {'value': false},
        size: {'width': 62.0, 'height': 48.0},
      )
    },
    {
      'label': 'Calendar',
      'icon': Remix.calendar_line,
      'config': WidgetConfig(
        type: 'Calendar',
        properties: {'date': '2025-02-10'},
        size: {'width': 62.0, 'height': 62.0},
      )
    },
    {
      'label': 'Toggle',
      'icon': Remix.toggle_line,
      'config': WidgetConfig(
        type: 'Toggle',
        properties: {'value': false},
        size: {'width': 62.0, 'height': 48.0},
      )
    },
    {
      'label': 'Table',
      'icon': Remix.table_view,
      'config': WidgetConfig(
        type: 'Table',
        properties: {'data': []},
        size: {'width': 400.0, 'height': 400.0},
      )
    },
    {
      'label': 'Chart',
      'icon': Remix.bar_chart_box_line,
      'config': WidgetConfig(
        type: 'Chart',
        properties: {'data': []},
        size: {'width': 400.0, 'height': 400.0},
      )
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 166,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFFF0000), width: 0.5),
      ),
      child: GridView.builder(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 0,
          crossAxisSpacing: 0,
          childAspectRatio: 1,
        ),
        itemCount: widgets.length,
        itemBuilder: (context, index) => Draggable<WidgetConfig>(
          data: widgets[index]['config'] as WidgetConfig,
          feedback: Container(
            width: 62,
            height: 62,
            decoration: BoxDecoration(
              color: const Color.fromRGBO(255, 255, 255, 0.9),
              border: Border.all(width: 1),
            ),
            child: Center(
              child: Icon(
                widgets[index]['icon'] as IconData,
                color: Colors.grey,
              ),
            ),
          ),
          child: Container(
            decoration: BoxDecoration(
              border: Border.all(width: 0.5),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  widgets[index]['icon'] as IconData,
                  color: Colors.grey,
                ),
                Text(
                  widgets[index]['label'] as String,
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
/// 캔버스영역 (이제 WidgetTree): 위젯 트리 구조로 표시
class WidgetTree extends ConsumerWidget {
  const WidgetTree({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final widgets = ref.watch(canvasProvider);
    return Container(
      width: 240,
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFFF0000), width: 0.5),
      ),
      child: ReorderableListView(
        onReorder: (oldIndex, newIndex) {
          ref.read(canvasProvider.notifier).reorderWidget(oldIndex, newIndex);
        },
        // 각 항목에 고유한 key를 부여합니다.
        children: widgets.asMap().entries.map((entry) {
          final index = entry.key;
          final config = entry.value;
          return _buildNode(config, ref, index, key: ValueKey(config));
        }).toList(),
      ),
    );
  }

  Widget _buildNode(WidgetConfig config, WidgetRef ref, int index,
      {Key? key}) {
    // Container 위젯: 자식들을 ReorderableListView로 감싸 드래그로 순서 변경 가능
    if (config.properties.containsKey('children')) {
      final List<WidgetConfig> children = (config.properties['children']
              as List<dynamic>? ??
          [])
          .map((e) => e as WidgetConfig)
          .toList();
      return ExpansionTile(
        key: key,
        title: Row(
          children: [
            Icon(_resolveIcon(config)),
            const SizedBox(width: 6),
            Text(config.type),
          ],
        ),
        children: [
          Container(
            // 리스트뷰에 내부 패딩 설정
            padding: const EdgeInsets.only(left: 12.0),
            child: ReorderableListView(
              shrinkWrap: true,
              physics: const ClampingScrollPhysics(),
              onReorder: (oldIndex, newIndex) {
                List<WidgetConfig> newChildren =
                    List.from(children);
                if (newIndex > oldIndex) {
                  newIndex -= 1;
                }
                final moved = newChildren.removeAt(oldIndex);
                newChildren.insert(newIndex, moved);
                // Container의 children 업데이트
                final updatedConfig = config.copyWith(
                  properties: {
                    ...config.properties,
                    'children': newChildren,
                  },
                );
                final canvasWidgets = ref.read(canvasProvider);
                final containerIndex = canvasWidgets.indexOf(config);
                if (containerIndex != -1) {
                  ref
                      .read(canvasProvider.notifier)
                      .updateWidget(containerIndex, updatedConfig);
                }
              },
              children: children.asMap().entries.map((childEntry) {
                final childIndex = childEntry.key;
                final childConfig = childEntry.value;
                return ListTile(
                  key: ValueKey(childConfig),
                  title: _buildNode(childConfig, ref, childIndex,
                      key: ValueKey(childConfig)),
                );
              }).toList(),
            ),
          )
        ],
        onExpansionChanged: (expanded) {
          if (expanded) {
            ref.read(selectedWidgetProvider.notifier).select(config, index);
          }
        },
      );
    } else {
      return ListTile(
        key: key,
        title: Row(
          children: [
            Icon(_resolveIcon(config)),
            const SizedBox(width: 6),
            Text(config.type),
          ],
        ),
        onTap: () {
          ref.read(selectedWidgetProvider.notifier).select(config, index);
        },
      );
    }
  }

  IconData _resolveIcon(WidgetConfig config) {
    switch (config.type) {
      case 'Input':
        return Remix.t_box_line;
      case 'Button':
        return Remix.checkbox_blank_line;
      case 'Select':
        return Remix.dropdown_list;
      case 'Image':
        return Remix.image_line;
      case 'Check':
        return Remix.checkbox_line;
      case 'Radio':
        return Remix.radio_button_line;
      case 'Calendar':
        return Remix.calendar_line;
      case 'Toggle':
        return Remix.toggle_line;
      case 'Table':
        return Remix.table_view;
      case 'Chart':
        return Remix.bar_chart_box_line;
      case 'Container':
        return Icons.widgets;
      default:
        return Icons.device_unknown;
    }
  }
}
/// 레이아웃패널: 가변 너비 (Expanded 사용)
class LayoutPanel extends ConsumerWidget {
  const LayoutPanel({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final widgets = ref.watch(canvasProvider);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(0),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border.all(color: const Color(0xFFFF0000), width: 0.5),
        ),
        child: DragTarget<WidgetConfig>(
          onAcceptWithDetails: (details) {
            ref.read(canvasProvider.notifier).addWidget(details.data);
          },
          builder: (context, candidateData, rejectedData) {
            return InteractiveViewer(
              boundaryMargin: const EdgeInsets.all(20),
              minScale: 0.1,
              maxScale: 4.0,
              child: Stack(
                children: widgets.asMap().entries.map((entry) {
                  final index = entry.key;
                  final config = entry.value;
                  return Positioned(
                    left: config.position['x']!,
                    top: config.position['y']!,
                    child: GestureDetector(
                      onTap: () {
                        ref
                            .read(selectedWidgetProvider.notifier)
                            .select(config, index);
                      },
                      child: SizedBox(
                        width: config.size['width']!,
                        height: config.size['height']!,
                        child: _buildPreviewWidget(config),
                      ),
                    ),
                  );
                }).toList(),
              ),
            );
          },
        ),
      ),
    );
  }
  
  Widget _buildPreviewWidget(WidgetConfig config, {void Function(WidgetConfig)? onUpdate}) {
    Widget child;
    switch (config.type) {
      case 'Text':
        child = Text(config.properties['text'] ?? '');
        break;
      case 'Button':
        child = ElevatedButton(
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
          onPressed: () {}, // 동작하지 않도록 빈 콜백
          child: Text(config.properties['text'] ?? ''),
        );
        break;
      case 'Select':
        child = DropdownButton<String>(
          items: (config.properties['options'] as List<dynamic>? ?? [])
              .map((e) => DropdownMenuItem(
                    value: e.toString(),
                    child: Text(e.toString()),
                  ))
              .toList(),
          hint: Text(config.properties['hint'] ?? ''),
          onChanged: (value) {}, // 동작하지 않음
        );
        break;
      case 'Container':
        child = Consumer(builder: (context, ref, childWidget) {
          final canvasWidgets = ref.watch(canvasProvider);
          final containerIndex = canvasWidgets.indexOf(config);
          final List<dynamic> childrenList =
              config.properties['children'] as List<dynamic>? ?? [];
          return DragTarget<WidgetConfig>(
            onWillAcceptWithDetails: (details) => true,
            onAcceptWithDetails: (details) {
              final incoming = details.data;
              final updatedChildren = List<WidgetConfig>.from(
                childrenList.map((e) => e as WidgetConfig),
              );
              final adjustedWidget = incoming.copyWith(
                position: {
                  'x': 0.0,
                  'y': childrenList.isEmpty
                      ? 0.0
                      : (childrenList.last as WidgetConfig).position['y']! + 50.0,
                },
              );
              updatedChildren.add(adjustedWidget);
              final updatedConfig = config.copyWith(
                properties: {
                  ...config.properties,
                  'children': updatedChildren,
                },
              );
              if (containerIndex != -1) {
                ref.read(canvasProvider.notifier).updateWidget(containerIndex, updatedConfig);
              } else if (onUpdate != null) {
                onUpdate(updatedConfig);
              }
            },
            builder: (context, candidateData, rejectedData) {
              return Container(
                width: config.size['width'],
                height: config.size['height'],
                decoration: BoxDecoration(
                  border: Border.all(
                    color: candidateData.isNotEmpty ? Colors.green : Colors.blueAccent,
                    width: 1,
                  ),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Container'),
                      ...childrenList.map((childConfig) {
                        final childWidget = childConfig as WidgetConfig;
                        return Padding(
                          padding: const EdgeInsets.all(4.0),
                          child: SizedBox(
                            width: childWidget.size['width']!,
                            height: childWidget.size['height']!,
                            child: _buildPreviewWidget(childWidget, onUpdate: (updatedChild) {
                              // 업데이트 로직
                            }),
                          ),
                        );
                      }),
                      if (candidateData.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.all(4),
                          color: Colors.green.withOpacity(0.3),
                          child: const Text(
                            'Drop Here',
                            style: TextStyle(fontSize: 10),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          );
        });
        break;
      default:
        child = const Placeholder();
    }
    // Container 위젯은 드랍 기능을 위해 AbsorbPointer를 적용하지 않음
    if (config.type == 'Container') {
      return child;
    }
    return AbsorbPointer(child: child);
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
          border: Border.all(color: const Color(0xFFFF0000), width: 0.5),
        ),
        child: DragTarget<WidgetConfig>(
          onAcceptWithDetails: (details) {
            ref.read(canvasProvider.notifier).addWidget(details.data);
          },
          builder: (context, candidateData, rejectedData) {
            return InteractiveViewer(
              boundaryMargin: const EdgeInsets.all(20),
              minScale: 0.1,
              maxScale: 4.0,
              child: Stack(
                children: widgets.asMap().entries.map((entry) {
                  final index = entry.key;
                  final config = entry.value;
                  return Positioned(
                    left: config.position['x']!,
                    top: config.position['y']!,
                    child: GestureDetector(
                      onTap: () {
                        ref
                            .read(selectedWidgetProvider.notifier)
                            .select(config, index);
                      },
                      child: SizedBox(
                        width: config.size['width']!,
                        height: config.size['height']!,
                        child: _buildPreviewWidget(config),
                      ),
                    ),
                  );
                }).toList(),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildPreviewWidget(WidgetConfig config, {void Function(WidgetConfig)? onUpdate}) {
    switch (config.type) {
      case 'Text':
        return Text(config.properties['text'] ?? '');
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
          child: Text(config.properties['text'] ?? ''),
        );
      case 'Select':
        return DropdownButton<String>(
          items: (config.properties['options'] as List<dynamic>? ?? [])
              .map(
                (e) => DropdownMenuItem(
                  value: e.toString(),
                  child: Text(e.toString()),
                ),
              )
              .toList(),
          hint: Text(config.properties['hint'] ?? ''),
          onChanged: (value) {},
        );
      case 'Container':
        return Consumer(builder: (context, ref, child) {
          final canvasWidgets = ref.watch(canvasProvider);
          final containerIndex = canvasWidgets.indexOf(config);
          final List<dynamic> childrenList =
              config.properties['children'] as List<dynamic>? ?? [];
          return DragTarget<WidgetConfig>(
            onWillAccept: (incoming) => true,
            onAccept: (incoming) {
              final updatedChildren = List<WidgetConfig>.from(
                childrenList.map((e) => e as WidgetConfig),
              );
              final adjustedWidget = incoming.copyWith(
                position: {
                  'x': 0.0,
                  'y': childrenList.isEmpty
                      ? 0.0
                      : (childrenList.last as WidgetConfig).position['y']! + 50.0,
                },
              );
              updatedChildren.add(adjustedWidget);
              final updatedConfig = config.copyWith(
                properties: {
                  ...config.properties,
                  'children': updatedChildren,
                },
              );
              if (containerIndex != -1) {
                ref.read(canvasProvider.notifier).updateWidget(containerIndex, updatedConfig);
              } else if (onUpdate != null) {
                onUpdate(updatedConfig);
              }
            },
            builder: (context, candidateData, rejectedData) {
              return Container(
                width: config.size['width'],
                height: config.size['height'],
                decoration: BoxDecoration(
                  border: Border.all(
                    color: candidateData.isNotEmpty ? Colors.green : Colors.blueAccent,
                    width: 1,
                  ),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Container'),
                      ...childrenList.map((childConfig) {
                        final child = childConfig as WidgetConfig;
                        return Padding(
                          padding: const EdgeInsets.all(4.0),
                          child: SizedBox(
                            width: child.size['width']!,
                            height: child.size['height']!, // height 추가
                            child: _buildPreviewWidget(child, onUpdate: (updatedChild) {
                              // 자식 컨테이너 업데이트 시, 현재 컨테이너의 children 목록에 반영합니다.
                              final updatedChildren = List<WidgetConfig>.from(
                                childrenList.map((e) => e as WidgetConfig),
                              );
                              final childIndex = updatedChildren.indexWhere((element) => element == child);
                              if (childIndex != -1) {
                                updatedChildren[childIndex] = updatedChild;
                                final updatedConfig = config.copyWith(
                                  properties: {
                                    ...config.properties,
                                    'children': updatedChildren,
                                  },
                                );
                                if (containerIndex != -1) {
                                  ref.read(canvasProvider.notifier).updateWidget(containerIndex, updatedConfig);
                                } else if (onUpdate != null) {
                                  onUpdate(updatedConfig);
                                }
                              }
                            }),
                          ),
                        );
                      }).toList(),
                      if (candidateData.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.all(4),
                          color: Colors.green.withOpacity(0.3),
                          child: const Text(
                            'Drop Here',
                            style: TextStyle(fontSize: 10),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          );
        });
      default:
        return const Placeholder();
    }
  }

  // 헬퍼: children 리스트를 위젯으로 변환 (재귀적으로 _buildPreviewWidget 사용)
  List<Widget> updatedChildren(List<dynamic> childrenList) {
    return childrenList.map<Widget>((childConfig) {
      final wc = childConfig as WidgetConfig;
      return SizedBox(
        width: wc.size['width']!,
        height: wc.size['height']!,
        child: _buildPreviewWidget(wc), // 재귀 호출
      );
    }).toList();
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
      width: 240, // width 240으로 설정
      height: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: const Color(0xFFFF0000), width: 0.5),
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
      case 'Container':
        fields = [
          const Text('Container 위젯은 레이아웃 역할을 합니다.'),
          const Text('자식 위젯들은 NodeArea에서 별도로 편집하세요.'),
          ElevatedButton(
            onPressed: () {
              // Container에 자식 위젯 추가 로직 구현
              // 예: ref.read(canvasProvider.notifier).addWidget(WidgetConfig(...));
            },
            child: const Text('자식 위젯 추가'),
          ),
        ];
        break;
      default:
        fields = [const Text('지원되지 않는 위젯 유형')];
    }
    // 공통 위치 조정 필드
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

  Widget _buildPreviewWidget(WidgetConfig config, {void Function(WidgetConfig)? onUpdate}) {
    switch (config.type) {
      case 'Text':
        return Text(config.properties['text'] ?? '');
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
          child: Text(config.properties['text'] ?? ''),
        );
      case 'Select':
        return DropdownButton<String>(
          items: (config.properties['options'] as List<dynamic>? ?? [])
              .map(
                (e) => DropdownMenuItem(
                  value: e.toString(),
                  child: Text(e.toString()),
                ),
              )
              .toList(),
          hint: Text(config.properties['hint'] ?? ''),
          onChanged: (value) {},
        );
      case 'Container':
        return Consumer(builder: (context, ref, child) {
          final canvasWidgets = ref.watch(canvasProvider);
          final containerIndex = canvasWidgets.indexOf(config);
          final List<dynamic> childrenList =
              config.properties['children'] as List<dynamic>? ?? [];
          return DragTarget<WidgetConfig>(
            onWillAccept: (incoming) => true,
            onAccept: (incoming) {
              final updatedChildren = List<WidgetConfig>.from(
                childrenList.map((e) => e as WidgetConfig),
              );
              final adjustedWidget = incoming.copyWith(
                position: {
                  'x': 0.0,
                  'y': childrenList.isEmpty
                      ? 0.0
                      : (childrenList.last as WidgetConfig).position['y']! + 50.0,
                },
              );
              updatedChildren.add(adjustedWidget);
              final updatedConfig = config.copyWith(
                properties: {
                  ...config.properties,
                  'children': updatedChildren,
                },
              );
              if (containerIndex != -1) {
                ref.read(canvasProvider.notifier).updateWidget(containerIndex, updatedConfig);
              } else if (onUpdate != null) {
                onUpdate(updatedConfig);
              }
            },
            builder: (context, candidateData, rejectedData) {
              return Container(
                width: config.size['width'],
                height: config.size['height'],
                decoration: BoxDecoration(
                  border: Border.all(
                    color: candidateData.isNotEmpty ? Colors.green : Colors.blueAccent,
                    width: 1,
                  ),
                ),
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Container'),
                      ...childrenList.map((childConfig) {
                        final child = childConfig as WidgetConfig;
                        return Padding(
                          padding: const EdgeInsets.all(4.0),
                          child: SizedBox(
                            width: child.size['width']!,
                            height: child.size['height']!, // height 추가
                            child: _buildPreviewWidget(child, onUpdate: (updatedChild) {
                              // 자식 컨테이너 업데이트 시, 현재 컨테이너의 children 목록에 반영합니다.
                              final updatedChildren = List<WidgetConfig>.from(
                                childrenList.map((e) => e as WidgetConfig),
                              );
                              final childIndex = updatedChildren.indexWhere((element) => element == child);
                              if (childIndex != -1) {
                                updatedChildren[childIndex] = updatedChild;
                                final updatedConfig = config.copyWith(
                                  properties: {
                                    ...config.properties,
                                    'children': updatedChildren,
                                  },
                                );
                                if (containerIndex != -1) {
                                  ref.read(canvasProvider.notifier).updateWidget(containerIndex, updatedConfig);
                                } else if (onUpdate != null) {
                                  onUpdate(updatedConfig);
                                }
                              }
                            }),
                          ),
                        );
                      }).toList(),
                      if (candidateData.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.all(4),
                          color: Colors.green.withOpacity(0.3),
                          child: const Text(
                            'Drop Here',
                            style: TextStyle(fontSize: 10),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          );
        });
      default:
        return const Placeholder();
    }
  }

  // 헬퍼: children 리스트를 위젯으로 변환 (재귀적으로 _buildPreviewWidget 사용)
  List<Widget> updatedChildren(List<dynamic> childrenList) {
    return childrenList.map<Widget>((childConfig) {
      final wc = childConfig as WidgetConfig;
      return SizedBox(
        width: wc.size['width']!,
        height: wc.size['height']!,
        child: _buildPreviewWidget(wc), // 재귀 호출
      );
    }).toList();
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
  FrameRateMonitorState createState() => FrameRateMonitorState();
}

class FrameRateMonitorState extends State<FrameRateMonitor>
    with WidgetsBindingObserver {
  Ticker? ticker;
  int frameCount = 0;
  int lastFrameTime = 0;
  double fps = 0.0;
  final List<double> fpsHistory = [];
  final int maxHistoryLength = 30;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    ticker = Ticker(onTick)..start();
  }

  void onTick(Duration duration) {
    int currentTime = duration.inMilliseconds;
    frameCount++;

    int elapsed = currentTime - lastFrameTime;
    // 500ms 간격으로 FPS 계산
    if (elapsed >= 500) {
      setState(() {
        fps = (frameCount / elapsed) * 1000;
        frameCount = 0;
        lastFrameTime = currentTime;

        if (fpsHistory.length >= maxHistoryLength) {
          fpsHistory.removeAt(0);
        }
        fpsHistory.add(fps);
      });
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    ticker?.dispose();
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
          '${fps.toStringAsFixed(1)} FPS',
          style: const TextStyle(color: Colors.white, fontSize: 12),
        ),
      ),
    );
  }
}
