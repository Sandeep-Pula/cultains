import { useEffect, useMemo, useState } from 'react';
import { Clock3, ExternalLink, FileText, Presentation, Send } from 'lucide-react';
import { ProductWordmark } from './BrandWordmark';
import styles from './SurveyPage.module.css';

const defaultGoogleFormOpenUrl = 'https://forms.gle/2AeFu9vikdEh4WGAA';
const defaultGoogleFormEmbedUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLSdcStZm2aLjb4DsoklCvrJL8p35L-ZrMYHPM5-Hk50f6xKw-w/viewform?embedded=true';
const defaultDeckUrl = `${import.meta.env.BASE_URL}demo_slides.pdf`;

const normalizeGoogleFormEmbedUrl = (value: string) => {
  if (!value) return '';

  try {
    const url = new URL(value);
    if (url.hostname === 'docs.google.com' && url.pathname.includes('/forms/')) {
      url.searchParams.set('embedded', 'true');
      return url.toString();
    }
  } catch {
    return value;
  }

  return value;
};

const getParamUrl = (param: string) => {
  const params = new URLSearchParams(window.location.search);
  return params.get(param) || '';
};

export const SurveyPage = () => {
  const [activeMobilePanel, setActiveMobilePanel] = useState<'survey' | 'deck'>('survey');

  const formOpenUrl = useMemo(() => {
    return getParamUrl('form') || import.meta.env.VITE_SURVEY_GOOGLE_FORM_URL || defaultGoogleFormOpenUrl;
  }, []);

  const formEmbedUrl = useMemo(() => {
    const configuredUrl = getParamUrl('form') || import.meta.env.VITE_SURVEY_GOOGLE_FORM_URL || defaultGoogleFormEmbedUrl;
    return normalizeGoogleFormEmbedUrl(configuredUrl);
  }, []);

  const deckUrl = useMemo(() => {
    return getParamUrl('deck') || import.meta.env.VITE_SURVEY_DECK_PDF_URL || defaultDeckUrl;
  }, []);

  const deckEmbedUrl = useMemo(() => {
    if (!deckUrl) return '';
    return deckUrl.includes('#') ? deckUrl : `${deckUrl}#view=FitH`;
  }, [deckUrl]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className={styles.page}>
      <section className={styles.header} aria-labelledby="survey-title">
        <div>
          <span className={styles.eyebrow}>Customer survey</span>
          <h1 id="survey-title">
            Help shape PULA Biz.
          </h1>
          <p>
            Answer the short survey, then review the deck to see how <ProductWordmark /> can support daily operations.
          </p>
        </div>
      </section>

      <div className={styles.mobileTabs} role="tablist" aria-label="Survey page sections">
        <button
          type="button"
          className={activeMobilePanel === 'survey' ? styles.activeTab : ''}
          aria-selected={activeMobilePanel === 'survey'}
          role="tab"
          onClick={() => setActiveMobilePanel('survey')}
        >
          Survey
        </button>
        <button
          type="button"
          className={activeMobilePanel === 'deck' ? styles.activeTab : ''}
          aria-selected={activeMobilePanel === 'deck'}
          role="tab"
          onClick={() => setActiveMobilePanel('deck')}
        >
          Deck
        </button>
      </div>

      <section className={styles.workspace} aria-label="Survey and product deck">
        <article className={`${styles.panel} ${styles.formPanel} ${activeMobilePanel === 'survey' ? styles.activePanel : styles.inactivePanel}`}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <Send size={18} />
              <h2>Business requirements form</h2>
            </div>
            {formOpenUrl ? (
              <a className={styles.utilityLink} href={formOpenUrl} target="_blank" rel="noreferrer">
                <span>Open in Google Forms</span>
                <ExternalLink size={15} />
              </a>
            ) : null}
          </div>

          <div className={styles.trustNote}>
            <Clock3 size={16} />
            <span>Takes 3-5 minutes. Your answers help us recommend the right PULA Biz setup.</span>
          </div>

          <div className={styles.embedShell}>
            {formEmbedUrl ? (
              <iframe
                title="PULA Biz customer survey form"
                src={formEmbedUrl}
                className={styles.embedFrame}
                loading="eager"
              >
                Loading form...
              </iframe>
            ) : (
              <div className={styles.emptyState}>
                <h3>Google Form URL needed</h3>
                <p>Set VITE_SURVEY_GOOGLE_FORM_URL, or add a form URL with the form query parameter.</p>
              </div>
            )}
          </div>
        </article>

        <article className={`${styles.panel} ${styles.deckPanel} ${activeMobilePanel === 'deck' ? styles.activePanel : styles.inactivePanel}`}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <FileText size={18} />
              <h2>Product walkthrough</h2>
            </div>
            {deckUrl ? (
              <a className={styles.utilityLink} href={deckUrl} target="_blank" rel="noreferrer">
                <span>Open PDF</span>
                <ExternalLink size={15} />
              </a>
            ) : null}
          </div>

          <div className={`${styles.embedShell} ${styles.deckShell}`}>
            <div className={styles.deckIntro}>
              <div className={styles.deckPreviewMark}>
                <Presentation size={22} />
              </div>
              <div>
                <h3>PULA Biz product walkthrough</h3>
                <p>Review the overview while you answer the survey, or open the PDF in a larger tab.</p>
              </div>
            </div>
            {deckEmbedUrl ? (
              <iframe
                title="PULA Biz product overview PDF"
                src={deckEmbedUrl}
                className={styles.embedFrame}
                loading="lazy"
              >
                Loading PDF...
              </iframe>
            ) : (
              <div className={styles.emptyState}>
                <h3>PDF deck URL needed</h3>
                <p>Set VITE_SURVEY_DECK_PDF_URL, or add a PDF URL with the deck query parameter.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
};
