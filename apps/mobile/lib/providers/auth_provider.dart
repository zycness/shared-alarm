import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/fcm_service.dart';

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final User? user;
  final String? error;
  final bool loading;

  const AuthState({
    this.status = AuthStatus.unknown,
    this.user,
    this.error,
    this.loading = false,
  });

  AuthState copyWith({
    AuthStatus? status,
    User? user,
    String? error,
    bool? loading,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error,
      loading: loading ?? this.loading,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _api;
  FcmService? _fcmService;

  AuthNotifier(this._api) : super(const AuthState()) {
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final hasToken = await _api.hasToken();
    if (!hasToken) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return;
    }
    try {
      final user = await _api.getMe();
      state = state.copyWith(status: AuthStatus.authenticated, user: user);
      _initFcm();
    } catch (_) {
      await _api.logout();
      state = state.copyWith(status: AuthStatus.unauthenticated);
    }
  }

  void _initFcm() {
    _fcmService = FcmService(_api);
    _fcmService!.initialize().catchError((e) {
      debugPrint('FCM initialization error: $e');
    });
  }

  Future<void> register({
    required String email,
    required String password,
    required String displayName,
  }) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final result = await _api.register(
        email: email,
        password: password,
        displayName: displayName,
      );
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: result.user,
        loading: false,
      );
      _initFcm();
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: _extractError(e),
      );
    }
  }

  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(loading: true, error: null);
    try {
      final result = await _api.login(email: email, password: password);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        user: result.user,
        loading: false,
      );
      _initFcm();
    } catch (e) {
      state = state.copyWith(
        loading: false,
        error: _extractError(e),
      );
    }
  }

  Future<void> logout() async {
    if (_fcmService != null) {
      await _fcmService!.unregister();
      _fcmService = null;
    }
    await _api.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  String _extractError(Object e) {
    if (e is DioException && e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map && data.containsKey('message')) {
        return data['message'] as String;
      }
    }
    return 'An error occurred';
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(apiServiceProvider));
});
