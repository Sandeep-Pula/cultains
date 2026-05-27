import { useEffect, useState } from 'react';
import { Apple, Download, Laptop, MonitorDown, RefreshCw, Smartphone, TabletSmartphone } from 'lucide-react';
import styles from './PublicHome.module.css';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type PackageKey = 'apk' | 'dmg';

const packageDownloads: Record<PackageKey, { label: string; href: string }> = {
  apk: {
    label: 'Download APK',
    href: '/downloads/pula-biz-latest.apk',
  },
  dmg: {
    label: 'Download Mac DMG',
    href: '/downloads/pula-biz-mac-latest.dmg',
  },
};

export const AppInstallSection = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installHint, setInstallHint] = useState('Use the matching button for your phone, tablet, or laptop.');

  useEffect(() => {
    const iosNavigator = window.navigator as Navigator & { standalone?: boolean };
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in iosNavigator && Boolean(iosNavigator.standalone));
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallHint('Tap the Android, Windows, or Mac install button to install PULA Biz on this device.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const installFromBrowser = async (platform: 'Android' | 'Windows' | 'Mac') => {
    if (!installPrompt) {
      setInstallHint(`Open this page in Chrome or Edge on ${platform}, then choose Install app.`);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallHint(
      choice.outcome === 'accepted'
        ? 'PULA Biz is now on this device and will receive web updates automatically.'
        : 'You can install later from the browser menu.',
    );
  };

  const showAppleHint = (device: 'iPhone' | 'iPad') => {
    setInstallHint(`On ${device}, open this page in Safari, tap Share, then Add to Home Screen.`);
  };

  const showMacHint = () => {
    if (installPrompt) {
      void installFromBrowser('Mac');
      return;
    }

    setInstallHint('On Mac, open this page in Chrome, Edge, or Safari and choose Add to Dock or Install app.');
  };

  return (
    <section id="apps" className={styles.appSection} aria-labelledby="apps-title">
      <div className={styles.container}>
        <div className={styles.appGrid}>
          <div className={styles.appCopy}>
            <span className={styles.eyebrow}>Apps for every device</span>
            <h2 id="apps-title">One PULA Biz app across web, Android, iPhone, iPad, Windows, and Mac.</h2>
            <p>
              Install the same live workspace on phones, tablets, and laptops. When a new version is deployed from
              GitHub, the installed app refreshes from the web build without asking users to download another app
              package.
            </p>
          </div>

          <div className={styles.appPanel} aria-live="polite">
            <div className={styles.appStatus}>
              <RefreshCw size={18} />
              <span>{isStandalone ? 'Installed app mode is active on this device.' : installHint}</span>
            </div>

            <div className={styles.appButtonGrid}>
              <button type="button" className={styles.appButton} onClick={() => installFromBrowser('Android')}>
                <Smartphone size={20} />
                <span>Android App</span>
                <Download size={16} />
              </button>
              <button type="button" className={styles.appButton} onClick={() => showAppleHint('iPhone')}>
                <Apple size={20} />
                <span>iPhone App</span>
                <Download size={16} />
              </button>
              <button type="button" className={styles.appButton} onClick={() => showAppleHint('iPad')}>
                <TabletSmartphone size={20} />
                <span>iPad App</span>
                <Download size={16} />
              </button>
              <button type="button" className={styles.appButton} onClick={() => installFromBrowser('Windows')}>
                <MonitorDown size={20} />
                <span>Windows App</span>
                <Download size={16} />
              </button>
              <button type="button" className={styles.appButton} onClick={showMacHint}>
                <Laptop size={20} />
                <span>Mac App</span>
                <Download size={16} />
              </button>
            </div>

            <div className={styles.packageLinks} aria-label="Direct package downloads">
              {Object.entries(packageDownloads).map(([key, download]) => (
                <a key={key} href={download.href} download className={styles.packageLink}>
                  <Download size={16} />
                  <span>{download.label}</span>
                </a>
              ))}
            </div>

            <div className={styles.appNotes}>
              <span>Website: web browser version</span>
              <span>Android and Windows: Chrome or Edge install</span>
              <span>iOS and iPadOS: Safari home screen app</span>
              <span>Mac: browser install now, DMG when native build is uploaded</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
