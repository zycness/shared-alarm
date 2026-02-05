import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/create_alarm_screen.dart';
import 'screens/alarm_detail_screen.dart';
import 'screens/alarm_ringing_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isAuth = authState.status == AuthStatus.authenticated;
      final isAuthRoute =
          state.matchedLocation == '/login' || state.matchedLocation == '/register';
      final isAlarmRinging = state.matchedLocation.startsWith('/alarm-ringing');

      if (authState.status == AuthStatus.unknown) return null;
      if (isAlarmRinging) return null;

      if (!isAuth && !isAuthRoute) return '/login';
      if (isAuth && isAuthRoute) return '/';

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const HomeScreen(),
      ),
      GoRoute(
        path: '/create',
        builder: (context, state) => const CreateAlarmScreen(),
      ),
      GoRoute(
        path: '/alarm/:id',
        builder: (context, state) => AlarmDetailScreen(
          alarmId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/alarm-ringing/:id',
        builder: (context, state) => AlarmRingingScreen(
          alarmId: int.tryParse(state.pathParameters['id'] ?? '0') ?? 0,
          label: state.uri.queryParameters['label'] ?? 'Alarm!',
        ),
      ),
    ],
  );
});
