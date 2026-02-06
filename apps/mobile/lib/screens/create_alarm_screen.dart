import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import '../providers/alarm_provider.dart';

class CreateAlarmScreen extends ConsumerStatefulWidget {
  const CreateAlarmScreen({super.key});

  @override
  ConsumerState<CreateAlarmScreen> createState() => _CreateAlarmScreenState();
}

class _CreateAlarmScreenState extends ConsumerState<CreateAlarmScreen> {
  final _labelController = TextEditingController();
  int _minExtensionMinutes = 5;
  DateTime _targetDate = DateTime.now().add(const Duration(hours: 1));
  TimeOfDay _targetTime = TimeOfDay.fromDateTime(
    DateTime.now().add(const Duration(hours: 1)),
  );
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _labelController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _targetDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _targetDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _targetTime,
    );
    if (picked != null) {
      setState(() => _targetTime = picked);
    }
  }

  Future<void> _create() async {
    final l10n = AppLocalizations.of(context)!;

    if (_labelController.text.trim().isEmpty) {
      setState(() => _error = l10n.pleaseEnterLabel);
      return;
    }

    final target = DateTime(
      _targetDate.year,
      _targetDate.month,
      _targetDate.day,
      _targetTime.hour,
      _targetTime.minute,
    );

    if (target.isBefore(DateTime.now())) {
      setState(() => _error = l10n.targetTimeFuture);
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      await ref.read(alarmListProvider.notifier).createAlarm(
            targetTime: target.toUtc().toIso8601String(),
            minExtensionMinutes: _minExtensionMinutes,
            label: _labelController.text.trim(),
          );
      if (mounted) context.pop();
    } catch (e) {
      setState(() {
        _submitting = false;
        _error = l10n.failedCreateAlarm;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      appBar: AppBar(title: Text(l10n.createAlarm)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _labelController,
              decoration: InputDecoration(
                labelText: l10n.alarmLabel,
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.label),
              ),
            ),
            const SizedBox(height: 24),
            Text(l10n.targetDateTime, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickDate,
                    icon: const Icon(Icons.calendar_today),
                    label: Text(
                      '${_targetDate.month}/${_targetDate.day}/${_targetDate.year}',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _pickTime,
                    icon: const Icon(Icons.access_time),
                    label: Text(_targetTime.format(context)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Text(l10n.minExtensionMinutes, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                IconButton(
                  onPressed: _minExtensionMinutes > 1
                      ? () => setState(() => _minExtensionMinutes--)
                      : null,
                  icon: const Icon(Icons.remove_circle_outline),
                ),
                Text(
                  '$_minExtensionMinutes',
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  onPressed: () => setState(() => _minExtensionMinutes++),
                  icon: const Icon(Icons.add_circle_outline),
                ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(_error!, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center),
            ],
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _submitting ? null : _create,
              child: _submitting
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : Text(l10n.createAlarm, style: const TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
