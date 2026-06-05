import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  registerPushSubscription,
  unregisterPushSubscription,
  sendTestPush,
} from "@/features/notifications/lib/push.functions";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push-config";
import { Bell, BellOff, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-config";

type Status = "unsupported" | "denied" | "granted" | "default" | "loading";

export function PushNotifications() {
  const [status, setStatus] = useState<Status>("loading");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const regFn = useServerFn(registerPushSubscription);
  const unregFn = useServerFn(unregisterPushSubscription);
  const testFn = useServerFn(sendTestPush);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/push-sw.js");
        const existing = await reg.pushManager.getSubscription();
        if (existing) setEndpoint(existing.endpoint);
        if (!cancelled) setStatus(Notification.permission as Status);
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enableMut = useMutation({
    mutationFn: async () => {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Izin notifikasi ditolak");
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });
      }
      const json = sub.toJSON();
      await regFn({
        data: {
          endpoint: sub.endpoint,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
          user_agent: navigator.userAgent.slice(0, 500),
        },
      });
      return sub.endpoint;
    },
    onSuccess: (ep) => {
      setEndpoint(ep);
      setStatus("granted");
      toast.success("Notifikasi aktif di perangkat ini");
    },
    onError: (e) => toastError(e, "Gagal mengaktifkan"),
  });

  const disableMut = useMutation({
    mutationFn: async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unregFn({ data: { endpoint: sub.endpoint } });
        await sub.unsubscribe();
      }
    },
    onSuccess: () => {
      setEndpoint(null);
      toast.success("Notifikasi dimatikan");
    },
  });

  const testMut = useMutation({
    mutationFn: () => testFn(),
    onSuccess: (r) => toast.success(`Terkirim ke ${r.sent} perangkat`),
    onError: (e) => toastError(e, "Gagal mengirim test"),
  });

  if (status === "loading")
    return (
      <div className="bg-card p-5 rounded-3xl outline-1 outline-black/5 flex items-center gap-3">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Memuat...</span>
      </div>
    );

  if (status === "unsupported")
    return (
      <div className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BellOff className="size-4" />
          <span className="text-sm font-semibold">Push tidak didukung</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Browser ini tidak mendukung web push. Gunakan Chrome, Edge, Firefox, atau install app
          sebagai PWA di Android.
        </p>
      </div>
    );

  const isOn = status === "granted" && !!endpoint;

  return (
    <div className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="size-4 text-primary" />
        <h3 className="font-semibold text-sm">Push Notification</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Aktifkan agar pengingat obat, sholat, dan puasa sampai ke HP meski app tertutup.
      </p>
      {status === "denied" && (
        <p className="text-xs text-destructive">
          Izin diblokir. Aktifkan manual di pengaturan browser untuk situs ini.
        </p>
      )}
      {!isOn ? (
        <button
          onClick={() => enableMut.mutate()}
          disabled={enableMut.isPending || status === "denied"}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {enableMut.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Bell className="size-4" />
          )}
          Aktifkan notifikasi
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => testMut.mutate()}
            disabled={testMut.isPending}
            className="bg-card outline-1 outline-black/10 font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {testMut.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Test
          </button>
          <button
            onClick={() => disableMut.mutate()}
            disabled={disableMut.isPending}
            className="text-destructive font-semibold py-3 rounded-2xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <BellOff className="size-4" />
            Matikan
          </button>
        </div>
      )}
    </div>
  );
}
