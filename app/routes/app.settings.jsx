import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import styles from "./app.settings/setting.module.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  console.log('âš™ï¸  Settings page loaded for:', shopDomain);

  // Fetch current settings from backend
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(`${backendUrl}/api/settings/${shopDomain}`);
    const data = await response.json();

    return {
      shop: {
        domain: shopDomain,
      },
      settings: data.settings || null,
    };
  } catch (error) {
    console.error('âŒ Error fetching settings:', error);
    return {
      shop: {
        domain: shopDomain,
      },
      settings: null,
    };
  }
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get('actionType');

  if (actionType === 'saveSettings') {
    const shopDomain = session.shop;
    const settings = JSON.parse(formData.get('settings'));

    console.log('ðŸ’¾ Saving settings...');
    console.log('   Shop:', shopDomain);

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    try {
      const response = await fetch(`${backendUrl}/api/settings/${shopDomain}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('âœ… Settings saved successfully!');
        return {
          success: true,
          message: 'Settings saved successfully!',
        };
      } else {
        console.error('âŒ Failed to save settings:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to save settings',
        };
      }
    } catch (error) {
      console.error('âŒ Error saving settings:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  return { success: false };
};

export default function Settings() {
  const loaderData = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  // Default settings
  const defaultSettings = {
    button: {
      text: "See Before You Buy",
      bg_color: "#329580",
      text_color: "#FFFFFF",
      border_radius: 8,
      size: "medium"
    },
    popup: {
      title: "See Yourself in This Look",
      upload_button_text: "Upload Your Photo",
      generate_button_text: "Generate Preview",
      bg_color: "#FFFFFF",
      text_color: "#000000",
      border_radius: 12,
      header_bg_color: "#329580",
      upload_area_bg_color: "#F6F6F7",
      upload_btn_bg_color: "#329580",
      upload_btn_text_color: "#FFFFFF",
      generate_btn_bg_color: "#329580",
      generate_btn_text_color: "#FFFFFF"
    },
    add_to_cart_button: {
      text: "Add to Cart",
      bg_color: "#2a7f6d",
      text_color: "#FFFFFF",
      border_radius: 8,
      size: "medium"
    },
    entry_popup: {
      enabled: true,
      delay_seconds: 5,
      bg_color: "#0D2B1E",
      heading_text: "See yourself in it before you buy",
      sub_text: "Upload your photo. Our AI shows you wearing this exact product in seconds. Free \u2014 no sign-up needed.",
      cta_text: "Try it on now \u2192",
      cta_bg_color: "#111111",
      cta_text_color: "#FFFFFF",
      dismiss_text: "Maybe later",
    }
  };

  const [activeTab, setActiveTab] = useState('button');
  const [settings, setSettings] = useState(() => {
    const loadedSettings = loaderData.settings || {};
    return {
      button: { ...defaultSettings.button, ...(loadedSettings.button || {}) },
      popup: { ...defaultSettings.popup, ...(loadedSettings.popup || {}) },
      add_to_cart_button: { ...defaultSettings.add_to_cart_button, ...(loadedSettings.add_to_cart_button || {}) },
      entry_popup: { ...defaultSettings.entry_popup, ...(loadedSettings.entry_popup || {}) },
    };
  });
  const isSaving = fetcher.state === "submitting";

  // Show success/error messages
  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Settings saved successfully!");
    } else if (fetcher.data?.error) {
      shopify.toast.show(`Error: ${fetcher.data.error}`, { isError: true });
    }
  }, [fetcher.data, shopify]);

  // Update button settings
  const updateButtonSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      button: {
        ...prev.button,
        [key]: value
      }
    }));
  };

  // Update popup settings
  const updatePopupSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      popup: {
        ...prev.popup,
        [key]: value
      }
    }));
  };

  // Update add_to_cart_button settings
  const updateAddToCartButtonSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      add_to_cart_button: {
        ...prev.add_to_cart_button,
        [key]: value
      }
    }));
  };

  // Update entry_popup settings
  const updateEntryPopupSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      entry_popup: {
        ...prev.entry_popup,
        [key]: value
      }
    }));
  };

  // Save settings
  const handleSave = () => {
    fetcher.submit(
      {
        actionType: 'saveSettings',
        settings: JSON.stringify(settings),
      },
      { method: 'POST' }
    );
  };

  // Reset to defaults
  const handleReset = () => {
    if (confirm('Are you sure you want to reset to default settings?')) {
      setSettings(defaultSettings);
    }
  };

  const ColorCtrl = ({ label, value, onChange }) => (
    <div className={styles.ctrlRow}>
      <div>
        <div className={styles.ctrlLabel}>{label}</div>
      </div>
      <div className={styles.swatchWrap}>
        <div className={styles.swatch} style={{ background: value }}>
          <input type="color" value={value} onChange={e => onChange(e.target.value)} />
        </div>
        <input className={styles.hexInput} value={value}
          onChange={e => onChange(e.target.value)} maxLength={7} />
      </div>
    </div>
  );

  const TextCtrl = ({ label, value, onChange, placeholder }) => (
    <div className={styles.ctrlSection}>
      <div className={styles.ctrlSectionTitle}>{label}</div>
      <input className={styles.textInput} value={value}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );

  const s = settings;

  return (
    <s-page heading="Brand Customizer">
      <div className={styles.settingsRoot}>

        <div className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <div className={styles.sidebarHeadTitle}>See Before Buy AI</div>
            <div className={styles.sidebarHeadSub}>Customize your store experience</div>
          </div>

          {/* Feature tabs */}
          <div className={styles.featureTabs}>
            {[
              { id: 'button', icon: '🖱', title: 'Try The Look Button', sub: 'Product page trigger' },
              { id: 'popup', icon: '🖱', title: 'Popup Modal', sub: 'Upload & generate screen' },
              { id: 'entry_popup', icon: '✨', title: 'Entry Popup', sub: 'First-visit teaser' },
            ].map(ft => (
              <button key={ft.id}
                className={`${styles.featureTab} ${activeTab === ft.id ? styles.featureTabActive : ''}`}
                onClick={() => setActiveTab(ft.id)}
              >
                <div className={styles.featureTabIcon}>{ft.icon}</div>
                <div>
                  <div className={styles.featureTabTitle}>{ft.title}</div>
                  <div className={styles.featureTabSub}>{ft.sub}</div>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.sidebarDivider} />

          {/* Controls */}
          <div className={styles.controlsPanel}>

            {activeTab === 'button' && <>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Colors</div>
                <ColorCtrl label="Button background" value={s.button.bg_color} onChange={v => updateButtonSetting('bg_color', v)} />
                <ColorCtrl label="Button text color" value={s.button.text_color} onChange={v => updateButtonSetting('text_color', v)} />
              </div>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Style</div>
                <div className={styles.ctrlRow}>
                  <div className={styles.ctrlLabel}>Border radius: {s.button.border_radius}px</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="range" className={styles.radiusSlider} min={0} max={28} value={s.button.border_radius}
                      onChange={e => updateButtonSetting('border_radius', parseInt(e.target.value))} />
                    <span className={styles.radiusVal}>{s.button.border_radius}</span>
                  </div>
                </div>
              </div>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Text</div>
                <input className={styles.textInput} value={s.button.text}
                  onChange={e => updateButtonSetting('text', e.target.value)} placeholder="Try The Look" />
              </div>
              <div className={styles.sidebarDivider} />
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Add to Cart Button</div>
                <ColorCtrl label="Background" value={s.add_to_cart_button.bg_color} onChange={v => updateAddToCartButtonSetting('bg_color', v)} />
                <ColorCtrl label="Text color" value={s.add_to_cart_button.text_color} onChange={v => updateAddToCartButtonSetting('text_color', v)} />
                <div style={{ marginTop: 8 }}>
                  <input className={styles.textInput} value={s.add_to_cart_button.text}
                    onChange={e => updateAddToCartButtonSetting('text', e.target.value)} placeholder="Add to Cart" />
                </div>
              </div>
            </>}

            {activeTab === 'popup' && <>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Header Colors</div>
                <ColorCtrl label="Header background" value={s.popup.header_bg_color} onChange={v => updatePopupSetting('header_bg_color', v)} />
              </div>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Upload Button</div>
                <ColorCtrl label="Background" value={s.popup.upload_btn_bg_color} onChange={v => updatePopupSetting('upload_btn_bg_color', v)} />
                <ColorCtrl label="Text color" value={s.popup.upload_btn_text_color} onChange={v => updatePopupSetting('upload_btn_text_color', v)} />
              </div>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Generate Button</div>
                <ColorCtrl label="Background" value={s.popup.generate_btn_bg_color} onChange={v => updatePopupSetting('generate_btn_bg_color', v)} />
                <ColorCtrl label="Text color" value={s.popup.generate_btn_text_color} onChange={v => updatePopupSetting('generate_btn_text_color', v)} />
              </div>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Text</div>
                <div style={{ marginBottom: 8 }}>
                  <div className={styles.ctrlLabel} style={{ fontSize: 10, marginBottom: 4 }}>Popup title</div>
                  <input className={styles.textInput} value={s.popup.title}
                    onChange={e => updatePopupSetting('title', e.target.value)} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div className={styles.ctrlLabel} style={{ fontSize: 10, marginBottom: 4 }}>Upload button text</div>
                  <input className={styles.textInput} value={s.popup.upload_button_text}
                    onChange={e => updatePopupSetting('upload_button_text', e.target.value)} />
                </div>
                <div>
                  <div className={styles.ctrlLabel} style={{ fontSize: 10, marginBottom: 4 }}>Generate button text</div>
                  <input className={styles.textInput} value={s.popup.generate_button_text}
                    onChange={e => updatePopupSetting('generate_button_text', e.target.value)} />
                </div>
              </div>
            </>}

            {/* â”€â”€ ENTRY POPUP TAB â”€â”€ */}
            {activeTab === 'entry_popup' && <>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Visibility</div>
                <div className={styles.ctrlRow}>
                  <div className={styles.ctrlLabel}>Show entry popup</div>
                  <button className={`${styles.toggle} ${s.entry_popup.enabled ? styles.toggleOn : ''}`}
                    onClick={() => updateEntryPopupSetting('enabled', !s.entry_popup.enabled)} />
                </div>
                <div className={styles.ctrlRow}>
                  <div><div className={styles.ctrlLabel}>Delay</div></div>
                  <select className={styles.selectInput} value={s.entry_popup.delay_seconds}
                    onChange={e => updateEntryPopupSetting('delay_seconds', parseInt(e.target.value))}>
                    {[2,3,4,5,7,10,15,20,30].map(d => <option key={d} value={d}>{d}s</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Colors</div>
                <ColorCtrl label="Dark section background" value={s.entry_popup.bg_color} onChange={v => updateEntryPopupSetting('bg_color', v)} />
                <ColorCtrl label="CTA button" value={s.entry_popup.cta_bg_color} onChange={v => updateEntryPopupSetting('cta_bg_color', v)} />
                <ColorCtrl label="CTA text" value={s.entry_popup.cta_text_color} onChange={v => updateEntryPopupSetting('cta_text_color', v)} />
              </div>
              <div className={styles.ctrlSection}>
                <div className={styles.ctrlSectionTitle}>Text</div>
                <div style={{ marginBottom: 8 }}>
                  <div className={styles.ctrlLabel} style={{ fontSize: 10, marginBottom: 4 }}>Heading</div>
                  <input className={styles.textInput} value={s.entry_popup.heading_text}
                    onChange={e => updateEntryPopupSetting('heading_text', e.target.value)} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div className={styles.ctrlLabel} style={{ fontSize: 10, marginBottom: 4 }}>Sub text</div>
                  <input className={styles.textInput} value={s.entry_popup.sub_text}
                    onChange={e => updateEntryPopupSetting('sub_text', e.target.value)} />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div className={styles.ctrlLabel} style={{ fontSize: 10, marginBottom: 4 }}>CTA button text</div>
                  <input className={styles.textInput} value={s.entry_popup.cta_text}
                    onChange={e => updateEntryPopupSetting('cta_text', e.target.value)} />
                </div>
                <div>
                  <div className={styles.ctrlLabel} style={{ fontSize: 10, marginBottom: 4 }}>Dismiss text</div>
                  <input className={styles.textInput} value={s.entry_popup.dismiss_text}
                    onChange={e => updateEntryPopupSetting('dismiss_text', e.target.value)} />
                </div>
              </div>
            </>}
          </div>

          {/* â”€â”€ Save button â”€â”€ */}
          <div className={styles.saveWrap}>
            <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'â³ Saving...' : 'ðŸ’¾ Save Changes'}
            </button>
            <button className={styles.resetLink} onClick={handleReset}>Reset to defaults</button>
          </div>
        </div>

        {/* â”€â”€ MAIN PREVIEW AREA â”€â”€ */}
        <div className={styles.mainArea}>

          {/* â”€â”€ Try The Look Button preview â”€â”€ */}
          <div>
            <div className={styles.sectionLabel}>
              <div className={styles.sectionLabelBadge}>ðŸ”˜ Try The Look Button</div>
              <div className={styles.sectionLabelLine} />
            </div>
            <div className={styles.previewRow}>
              {/* Product page simulation */}
              <div className={styles.previewPanel}>
                <div className={styles.panelHead}>
                  <span className={styles.panelTitle}>Product page</span>
                  <span className={styles.panelBadge}>LIVE PREVIEW</span>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.fakePage}>
                    <div className={styles.fakePageImg}>ðŸ‘—</div>
                    <div className={styles.fakePageName}>Sample Product</div>
                    <div className={styles.fakePagePrice}>â‚¹2,499</div>
                    <button className={styles.fakePageAtc}>Add to Cart</button>
                    <button className={styles.brandBtn} style={{
                      background: s.button.bg_color,
                      color: s.button.text_color,
                      borderRadius: `${s.button.border_radius}px`,
                    }}>
                      âœ¦ {s.button.text || 'Try The Look'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* â”€â”€ Popup preview â”€â”€ */}
          <div>
            <div className={styles.sectionLabel}>
              <div className={styles.sectionLabelBadge}>ðŸªŸ Popup Modal</div>
              <div className={styles.sectionLabelLine} />
            </div>
            <div className={styles.previewRow}>
              {/* Upload screen */}
              <div className={styles.previewPanel}>
                <div className={styles.panelHead}>
                  <span className={styles.panelTitle}>Upload screen</span>
                  <span className={styles.panelBadge}>Screen 1</span>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.uploadModal}>
                    <div className={styles.umTop}>
                      <div>
                        <div className={styles.umTitle}>{s.popup.title || 'Try The Look'}</div>
                        <div className={styles.umSub}>See how it looks on you</div>
                      </div>
                      <button className={styles.umClose}>Ã—</button>
                    </div>
                    <div className={styles.umBody}>
                      <div className={styles.umAiBadge} style={{
                        background: `${s.popup.header_bg_color}1a`,
                        border: `1px solid ${s.popup.header_bg_color}33`,
                        color: s.popup.header_bg_color,
                      }}>âœ¦ AI Preview</div>
                      <div className={styles.umMain}>See it on you in seconds</div>
                      <div className={styles.umTip}>Upload a clear photo and our AI creates a live preview.</div>
                      <button className={styles.umUploadBtn} style={{
                        background: s.popup.upload_btn_bg_color,
                        color: s.popup.upload_btn_text_color,
                        borderRadius: `${s.button.border_radius}px`,
                      }}>â¬† {s.popup.upload_button_text || 'Choose Your Photo'}</button>
                      <div className={styles.umTipsGrid}>
                        {['Full body','Good lighting','Stand straight','Face camera'].map(t => (
                          <div key={t} className={styles.umChip}>{t}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist / result screen */}
              <div className={styles.previewPanel}>
                <div className={styles.panelHead}>
                  <span className={styles.panelTitle}>Result screen</span>
                  <span className={styles.panelBadge}>Screen 4</span>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.checklistCard}>
                    {[
                      { label: 'Lighting matched', sub: 'Ambient light blended' },
                      { label: 'Fabric texture applied', sub: 'Folds and weight rendered' },
                      { label: 'Shadow depth set', sub: 'Natural shadows added' },
                      { label: 'Face preserved', sub: 'Your identity unchanged' },
                    ].map((item, i) => (
                      <div key={i} className={styles.clItem} style={{
                        background: `${s.popup.header_bg_color}0d`,
                        borderColor: `${s.popup.header_bg_color}1a`,
                      }}>
                        <div className={styles.clCheck} style={{ background: s.popup.header_bg_color }}>âœ“</div>
                        <div>
                          <div className={styles.clLabel}>{item.label}</div>
                          <div className={styles.clSub}>{item.sub}</div>
                        </div>
                        <div className={styles.clDone} style={{ color: s.popup.header_bg_color }}>done</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <button style={{
                      width: '100%', background: s.add_to_cart_button.bg_color,
                      color: s.add_to_cart_button.text_color, border: 'none',
                      borderRadius: `${s.add_to_cart_button.border_radius}px`,
                      padding: '11px', fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>ðŸ›’ {s.add_to_cart_button.text || 'Add to Cart'}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* â”€â”€ Entry popup preview â”€â”€ */}
          <div>
            <div className={styles.sectionLabel}>
              <div className={styles.sectionLabelBadge}>âœ¨ Entry Popup</div>
              <div className={styles.sectionLabelLine} />
              {!s.entry_popup.enabled && (
                <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 600 }}>DISABLED</span>
              )}
            </div>
            <div className={styles.previewRow}>
              <div className={styles.previewPanel}>
                <div className={styles.panelHead}>
                  <span className={styles.panelTitle}>Entry popup</span>
                  <span className={styles.panelBadge}>After {s.entry_popup.delay_seconds}s Â· First visit only</span>
                </div>
                <div className={styles.panelBody}>
                  <div className={styles.entryPopupPreview}>
                    {/* Dark top */}
                    <div className={styles.epHeader} style={{ background: s.entry_popup.bg_color }}>
                      <button className={styles.epClose}>Ã—</button>
                      <div className={styles.epCards}>
                        <div className={styles.epCardLeft}>ðŸ‘—</div>
                        <div className={styles.epMerge} style={{ background: s.popup.header_bg_color }}>âœ¦</div>
                        <div className={styles.epCardRight}>
                          <div className={styles.epRightLabel}>your photo</div>
                          <div className={styles.epCam} style={{ background: s.popup.header_bg_color }}>ðŸ“·</div>
                        </div>
                      </div>
                      <div className={styles.epStrip} style={{
                        background: `${s.popup.header_bg_color}18`,
                        border: `1px solid ${s.popup.header_bg_color}28`,
                      }}>
                        <div className={styles.epStripThumb} />
                        <div>
                          <div className={styles.epStripTitle}>See yourself wearing it</div>
                          <div className={styles.epStripSub}>Before you add to cart</div>
                        </div>
                        <div className={styles.epStripBadge} style={{ background: s.popup.header_bg_color }}>NEW âœ¦</div>
                      </div>
                      <div className={styles.epTrust}>Â· Results in under 30 seconds Â·</div>
                    </div>
                    {/* White bottom */}
                    <div className={styles.epBody}>
                      <div className={styles.epTitle}>{s.entry_popup.heading_text}</div>
                      <div className={styles.epDesc}>{s.entry_popup.sub_text}</div>
                      <button className={styles.epCta} style={{
                        background: s.entry_popup.cta_bg_color,
                        color: s.entry_popup.cta_text_color,
                        borderRadius: `${s.button.border_radius}px`,
                      }}>{s.entry_popup.cta_text}</button>
                      <button className={styles.epSkip}>{s.entry_popup.dismiss_text}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </s-page>
  );
}
