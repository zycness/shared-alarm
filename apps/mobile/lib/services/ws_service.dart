import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';

class WsService {
  static const String _baseWsUrl = String.fromEnvironment(
    'WS_URL',
    defaultValue: 'ws://10.0.2.2:3000',
  );

  WebSocketChannel? _channel;
  StreamSubscription? _subscription;
  final _controller = StreamController<Map<String, dynamic>>.broadcast();
  String? _currentAlarmId;
  Timer? _reconnectTimer;

  Stream<Map<String, dynamic>> get stream => _controller.stream;

  void connect(String alarmId) {
    disconnect();
    _currentAlarmId = alarmId;
    _doConnect(alarmId);
  }

  void _doConnect(String alarmId) {
    try {
      final uri = Uri.parse('$_baseWsUrl/ws/$alarmId');
      _channel = WebSocketChannel.connect(uri);

      _subscription = _channel!.stream.listen(
        (data) {
          try {
            final decoded = jsonDecode(data as String) as Map<String, dynamic>;
            _controller.add(decoded);
          } catch (_) {}
        },
        onError: (_) => _scheduleReconnect(alarmId),
        onDone: () => _scheduleReconnect(alarmId),
      );
    } catch (_) {
      _scheduleReconnect(alarmId);
    }
  }

  void _scheduleReconnect(String alarmId) {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 3), () {
      if (_currentAlarmId == alarmId) {
        _doConnect(alarmId);
      }
    });
  }

  void disconnect() {
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _channel?.sink.close();
    _channel = null;
    _currentAlarmId = null;
  }

  void dispose() {
    disconnect();
    _controller.close();
  }
}
