class Alarm {
  final String id;
  final String ownerId;
  final String targetTime;
  final int minExtensionMinutes;
  final String label;
  final String shareToken;
  final String status;
  final String createdAt;
  final String updatedAt;
  final List<Extension>? extensions;

  Alarm({
    required this.id,
    required this.ownerId,
    required this.targetTime,
    required this.minExtensionMinutes,
    required this.label,
    required this.shareToken,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.extensions,
  });

  factory Alarm.fromJson(Map<String, dynamic> json) {
    return Alarm(
      id: json['id'] as String,
      ownerId: json['ownerId'] as String? ?? '',
      targetTime: json['targetTime'] as String,
      minExtensionMinutes: json['minExtensionMinutes'] as int,
      label: json['label'] as String,
      shareToken: json['shareToken'] as String? ?? '',
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      updatedAt: json['updatedAt'] as String,
      extensions: json['extensions'] != null
          ? (json['extensions'] as List)
              .map((e) => Extension.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
    );
  }

  bool get isActive => status == 'active';
  bool get isTriggered => status == 'triggered';
  bool get isCancelled => status == 'cancelled';
  DateTime get targetDateTime => DateTime.parse(targetTime);
}

class Extension {
  final String id;
  final String alarmId;
  final String extendedByName;
  final int extensionMinutes;
  final String previousTime;
  final String newTime;
  final String createdAt;

  Extension({
    required this.id,
    required this.alarmId,
    required this.extendedByName,
    required this.extensionMinutes,
    required this.previousTime,
    required this.newTime,
    required this.createdAt,
  });

  factory Extension.fromJson(Map<String, dynamic> json) {
    return Extension(
      id: json['id'] as String,
      alarmId: json['alarmId'] as String,
      extendedByName: json['extendedByName'] as String,
      extensionMinutes: json['extensionMinutes'] as int,
      previousTime: json['previousTime'] as String,
      newTime: json['newTime'] as String,
      createdAt: json['createdAt'] as String,
    );
  }
}
