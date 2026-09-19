import type { BufferConnection } from "../lib/business-os/buffer";
import styles from "./owner.module.css";

const messages: Record<string, string> = {
  BUFFER_API_KEY_MISSING: "Add the Buffer API key to connect X.",
  BUFFER_X_CHANNEL_MISSING: "The selected X account was not found in Buffer.",
  BUFFER_X_CHANNEL_AMBIGUOUS: "Choose which connected X account the app should use.",
  BUFFER_X_DISCONNECTED: "Reconnect your X account in Buffer.",
  BUFFER_X_LOCKED: "Your X channel is locked in Buffer.",
  BUFFER_X_QUEUE_PAUSED: "Your X queue is paused in Buffer.",
};

export default function BufferPanel({ connection, busy, storageReady, onCheck, onTest }: {
  connection?: BufferConnection; busy: boolean; storageReady: boolean;
  onCheck: () => Promise<void>; onTest: () => Promise<boolean>;
}) {
  return <section className={styles.panel}>
    <h2>X publishing connection</h2>
    <p>{!connection ? "Connection not checked yet." : connection.ready
      ? `Connected to ${connection.xChannel?.displayName || connection.xChannel?.name || "your X account"}.`
      : messages[connection.error || ""] || "The Buffer connection could not be verified."}</p>
    <div className={styles.buttonRow}>
      <button disabled={busy} onClick={onCheck}>Check X connection</button>
      <button disabled={busy || !storageReady || !connection?.ready} onClick={onTest}>Test with a private draft</button>
    </div>
    <p className={styles.muted}>The test saves one clearly labeled draft in Buffer and checks it was received. It does not schedule or publish a post. Repeated checks reuse the same test.</p>
    <p className={styles.muted}>Approvals are still recorded as decisions. Automatic public publishing has not been activated.</p>
  </section>;
}
