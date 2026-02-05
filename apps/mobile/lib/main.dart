import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'providers/locale_provider.dart';
import 'services/alarm_service.dart';
import 'services/fcm_service.dart';
import 'router.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await AlarmService.init();
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  runApp(const ProviderScope(child: SharedAlarmApp()));
}

class SharedAlarmApp extends ConsumerStatefulWidget {
  const SharedAlarmApp({super.key});

  @override
  ConsumerState<SharedAlarmApp> createState() => _SharedAlarmAppState();
}

class _SharedAlarmAppState extends ConsumerState<SharedAlarmApp> {
  @override
  void initState() {
    super.initState();
    _listenAlarmRing();
  }

  void _listenAlarmRing() {
    AlarmService.ringStream.listen((alarmSettings) {
      final router = ref.read(routerProvider);
      router.push(
        '/alarm-ringing/${alarmSettings.id}?label=${Uri.encodeComponent(alarmSettings.notificationSettings.title)}',
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);
    final locale = ref.watch(localeProvider);

    return MaterialApp.router(
      title: 'Shared Alarm',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      locale: locale,
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      routerConfig: router,
    );
  }
}
