const translations = {
  en: {
    sharedAlarm: "Shared Alarm",
    useSharedLink: "Use a shared link to view and extend an alarm.",
    alarmTriggered: "Alarm Triggered!",
    alarmTriggeredDesc: "This alarm has gone off.",
    alarmCancelled: "Alarm Cancelled",
    timesUp: "Time's Up!",
    days: "Days",
    hours: "Hours",
    min: "Min",
    sec: "Sec",
    yourName: "Your Name",
    enterYourName: "Enter your name",
    minutesLabel: "Minutes",
    minUnit: "min",
    extensionHistory: "Extension History",
    noExtensionsYet: "No extensions yet",
    failedToModify: "Failed to modify alarm",
    alarmNotFound: "Alarm not found",
    failedToExtend: "Failed to extend alarm",
    target: "Target",
    alarmHasBeenTriggered: "Alarm has been triggered",
    networkError: "Network error",
    failedToLoad: "Failed to load alarm",
    notificationTitle: "Alarm Triggered!",
  },
  es: {
    sharedAlarm: "Alarma Compartida",
    useSharedLink: "Usa un enlace compartido para ver y extender una alarma.",
    alarmTriggered: "\u00a1Alarma Activada!",
    alarmTriggeredDesc: "Esta alarma ha sonado.",
    alarmCancelled: "Alarma Cancelada",
    timesUp: "\u00a1Se acab\u00f3 el tiempo!",
    days: "D\u00edas",
    hours: "Horas",
    min: "Min",
    sec: "Seg",
    yourName: "Tu Nombre",
    enterYourName: "Ingresa tu nombre",
    minutesLabel: "Minutos",
    minUnit: "min",
    extensionHistory: "Historial de Extensiones",
    noExtensionsYet: "Sin extensiones a\u00fan",
    failedToModify: "Error al modificar la alarma",
    alarmNotFound: "Alarma no encontrada",
    failedToExtend: "Error al extender la alarma",
    target: "Objetivo",
    alarmHasBeenTriggered: "La alarma ha sido activada",
    networkError: "Error de red",
    failedToLoad: "Error al cargar la alarma",
    notificationTitle: "\u00a1Alarma Activada!",
  },
} as const;

type Lang = keyof typeof translations;
type TranslationKey = keyof (typeof translations)["en"];

function detectLang(): Lang {
  const nav = navigator.language || navigator.languages?.[0] || "en";
  return nav.startsWith("es") ? "es" : "en";
}

const currentLang = detectLang();

export function t(key: TranslationKey): string {
  return translations[currentLang][key];
}
