import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/alarm_provider.dart';
import '../models/alarm.dart';
import 'package:intl/intl.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(alarmListProvider.notifier).loadAlarms());
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(authProvider);
    final alarmState = ref.watch(alarmListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Alarms'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => ref.read(authProvider.notifier).logout(),
          ),
        ],
      ),
      body: alarmState.loading
          ? const Center(child: CircularProgressIndicator())
          : alarmState.error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(alarmState.error!, style: const TextStyle(color: Colors.red)),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => ref.read(alarmListProvider.notifier).loadAlarms(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : alarmState.alarms.isEmpty
                  ? const Center(
                      child: Text(
                        'No alarms yet.\nTap + to create one.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () => ref.read(alarmListProvider.notifier).loadAlarms(),
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: alarmState.alarms.length,
                        itemBuilder: (context, index) {
                          final alarm = alarmState.alarms[index];
                          return _AlarmCard(alarm: alarm);
                        },
                      ),
                    ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/create'),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _AlarmCard extends StatelessWidget {
  final Alarm alarm;

  const _AlarmCard({required this.alarm});

  Color get _statusColor {
    switch (alarm.status) {
      case 'active':
        return Colors.green;
      case 'triggered':
        return Colors.red;
      case 'cancelled':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final targetDate = DateTime.parse(alarm.targetTime).toLocal();
    final formatter = DateFormat('MMM d, y HH:mm');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Icon(
          alarm.isActive ? Icons.alarm : alarm.isTriggered ? Icons.alarm_on : Icons.alarm_off,
          color: _statusColor,
          size: 32,
        ),
        title: Text(
          alarm.label,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(formatter.format(targetDate)),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                alarm.status.toUpperCase(),
                style: TextStyle(color: _statusColor, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/alarm/${alarm.id}'),
      ),
    );
  }
}
