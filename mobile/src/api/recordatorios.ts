import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { cliente } from '@/api/cliente';

// Recordatorios locales (no pasan por ningún servidor: el celular los programa solo).
//  - "Aún tenés un convenio por firmar": a las X horas de tener un convenio por firmar. Se cancela al firmar.
//  - "Hay novedades": a las X horas de la última vez que se abrió la app. Se reprograma en cada apertura.

// X, en minutos. Para la demo está en 1 minuto; en uso real, por ejemplo 24 * 60 (24 horas).
export const MINUTOS_RECORDATORIO = 1;
const SEGUNDOS = MINUTOS_RECORDATORIO * 60;

const ID_FIRMA = 'por-firmar';
const ID_NOVEDADES = 'novedades';

// Con la app abierta también se muestra el aviso
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Android necesita un canal antes de preguntar el permiso. Si no se puede crear, se sigue igual:
// las notificaciones usan el canal que Android les da por defecto
async function crearCanal() {
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Recordatorios',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch (e) {
    console.warn('[recordatorios] no se pudo crear el canal:', e);
  }
}

// Pide el permiso (Android necesita un canal antes de poder preguntar). Devuelve si se puede avisar.
async function permitido() {
  if (Platform.OS === 'android') {
    await crearCanal();
  }
  const actual = await Notifications.getPermissionsAsync();
  console.log('[recordatorios] permiso actual:', actual.status);
  if (actual.granted) return true;
  const pedido = await Notifications.requestPermissionsAsync();
  console.log('[recordatorios] permiso pedido:', pedido.status);
  return pedido.granted;
}

function programar(id: string, texto: string) {
  return Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: 'Convenios UNLPam', body: texto },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: SEGUNDOS },
  });
}

// Cada vez que se abre la app: el aviso "Hay novedades" vuelve a empezar de cero
export async function reprogramarNovedades() {
  if (!(await permitido())) return;
  await Notifications.cancelScheduledNotificationAsync(ID_NOVEDADES);
  await programar(ID_NOVEDADES, 'Hay novedades');
}

// Programa el aviso de firma si hay convenios por firmar; lo cancela si no hay ninguno.
// Se llama al abrir la app y después de firmar.
export async function actualizarRecordatorioFirma() {
  if (!(await permitido())) return;

  let hayPorFirmar = false;
  try {
    const { data } = await cliente.get('/agreements/to-sign');
    hayPorFirmar = data.meta.total > 0;
  } catch {
    // Solo administración puede firmar: para los demás roles la API responde 403 y no hay aviso
  }

  if (!hayPorFirmar) {
    await Notifications.cancelScheduledNotificationAsync(ID_FIRMA);
    return;
  }

  // Si ya hay uno programado no se toca: así llega a las X horas desde que apareció, no desde la última apertura
  const programadas = await Notifications.getAllScheduledNotificationsAsync();
  if (!programadas.some((n) => n.identifier === ID_FIRMA)) {
    await programar(ID_FIRMA, 'Aún tenés un convenio por firmar');
  }
}

// Al cerrar sesión: sin sesión no hay nada para recordar
export async function cancelarRecordatorios() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Prueba para la demo: pide el permiso, programa un aviso a los 5 segundos y cuenta qué pasó
export async function probarNotificaciones() {
  try {
    if (Platform.OS === 'android') {
      await crearCanal();
    }
    const antes = (await Notifications.getPermissionsAsync()).status;
    const despues = (await Notifications.requestPermissionsAsync()).status;
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Convenios UNLPam', body: 'Prueba: la notificación funciona' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
    });
    const programadas = await Notifications.getAllScheduledNotificationsAsync();
    return `Permiso: ${antes} → ${despues}. Programadas: ${programadas.map((n) => n.identifier).join(', ')}. Tiene que llegar un aviso en 5 segundos.`;
  } catch (e) {
    return `Error: ${e instanceof Error ? e.message : String(e)}${e instanceof Error && e.cause ? ' | ' + String(e.cause) : ''}`;
  }
}
