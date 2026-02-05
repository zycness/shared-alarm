import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';
import '../models/alarm.dart';

class ApiService {
  static const String _baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://alarm.kevdevelopment.com',
  );

  final Dio _dio;
  final FlutterSecureStorage _storage;

  ApiService()
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {'Content-Type': 'application/json'},
        )),
        _storage = const FlutterSecureStorage() {
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        handler.next(error);
      },
    ));
  }

  // Auth
  Future<({String token, User user})> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    final response = await _dio.post('/api/auth/register', data: {
      'email': email,
      'password': password,
      'displayName': displayName,
    });
    final token = response.data['token'] as String;
    final user = User.fromJson(response.data['user'] as Map<String, dynamic>);
    await _storage.write(key: 'auth_token', value: token);
    return (token: token, user: user);
  }

  Future<({String token, User user})> login({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post('/api/auth/login', data: {
      'email': email,
      'password': password,
    });
    final token = response.data['token'] as String;
    final user = User.fromJson(response.data['user'] as Map<String, dynamic>);
    await _storage.write(key: 'auth_token', value: token);
    return (token: token, user: user);
  }

  Future<User> getMe() async {
    final response = await _dio.get('/api/auth/me');
    return User.fromJson(response.data['user'] as Map<String, dynamic>);
  }

  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
  }

  Future<bool> hasToken() async {
    final token = await _storage.read(key: 'auth_token');
    return token != null;
  }

  // Alarms
  Future<Alarm> createAlarm({
    required String targetTime,
    required int minExtensionMinutes,
    required String label,
  }) async {
    final response = await _dio.post('/api/alarms', data: {
      'targetTime': targetTime,
      'minExtensionMinutes': minExtensionMinutes,
      'label': label,
    });
    return Alarm.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<Alarm>> getAlarms() async {
    final response = await _dio.get('/api/alarms');
    return (response.data as List)
        .map((e) => Alarm.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Alarm> getAlarm(String id) async {
    final response = await _dio.get('/api/alarms/$id');
    return Alarm.fromJson(response.data as Map<String, dynamic>);
  }

  Future<Alarm> cancelAlarm(String id) async {
    final response = await _dio.delete('/api/alarms/$id');
    return Alarm.fromJson(response.data as Map<String, dynamic>);
  }

  String getShareUrl(String shareToken) {
    return '$_baseUrl/share/$shareToken';
  }
}
