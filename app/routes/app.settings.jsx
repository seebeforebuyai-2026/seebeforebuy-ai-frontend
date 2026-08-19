import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import styles from "./app.settings/settings.module.css";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const shopDomain = session.shop;

  console.log(' Settings page loaded for:', shopDomain);

  // Fetch current settings from backend
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

  // Fetch one real product from the store for the preview
  let previewProduct = null;
  try {
    const productRes = await admin.graphql(`
      query {
        products(first: 1) {
          nodes {
            title
            priceRangeV2 {
              minVariantPrice { amount currencyCode }
            }
            featuredImage { url altText }
          }
        }
      }
    `);
    const productData = await productRes.json();
    const node = productData.data?.products?.nodes?.[0];
    if (node) {
      previewProduct = {
        title: node.title,
        price: `${node.priceRangeV2.minVariantPrice.currencyCode} ${parseFloat(node.priceRangeV2.minVariantPrice.amount).toFixed(2)}`,
        image: node.featuredImage?.url || null,
        imageAlt: node.featuredImage?.altText || node.title,
      };
    }
  } catch (err) {
    console.warn('Could not fetch preview product:', err.message);
  }
  
  try {
    const response = await fetch(`${backendUrl}/api/settings/${shopDomain}`);
    const data = await response.json();

    return {
      shop: { domain: shopDomain },
      settings: data.settings || null,
      previewProduct,
    };
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    return {
      shop: { domain: shopDomain },
      settings: null,
      previewProduct,
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

    console.log('💾 Saving settings...');
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
        console.log('✅ Settings saved successfully!');
        return {
          success: true,
          message: 'Settings saved successfully!',
        };
      } else {
        console.error('❌ Failed to save settings:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to save settings',
        };
      }
    } catch (error) {
      console.error('❌ Error saving settings:', error);
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
  const previewProduct = loaderData.previewProduct;

  // Default settings
  const defaultSettings = {
    button: {
      text: "See Before You Buy",
      bg_color: "#008060",
      text_color: "#FFFFFF",
      border_radius: 8,
      size: "medium",
      show_education_banner: true,
      show_button_emoji: true,
    },
    popup: {
      title: "See Yourself in This Look",
      upload_button_text: "Upload Your Photo",
      generate_button_text: "Generate Preview",
      bg_color: "#FFFFFF",
      text_color: "#000000",
      border_radius: 12,
      header_bg_color: "#008060",
      upload_area_bg_color: "#F6F6F7",
      upload_btn_bg_color: "#008060",
      upload_btn_text_color: "#FFFFFF",
      generate_btn_bg_color: "#008060",
      generate_btn_text_color: "#FFFFFF"
    },
    add_to_cart_button: {
      text: "Add to Cart",
      bg_color: "#111827",
      text_color: "#FFFFFF",
      border_radius: 8,
      size: "medium"
    },
    entry_popup: {
      enabled: true,
      delay_seconds: 5,
      bg_color: "#0D1F18",
      heading_text: "See yourself in it before you buy",
      sub_text: "Upload your photo. Our AI shows you wearing this exact product in seconds. Free — no sign-up needed.",
      cta_text: "Try it on now →",
      cta_bg_color: "#008060",
      cta_text_color: "#FFFFFF",
      dismiss_text: "Maybe later",
    }
  };

  const [activeTab, setActiveTab] = useState('button'); // 'button' | 'popup' | 'entry_popup'
  const [subTab, setSubTab] = useState('colors'); // 'colors' | 'style' | 'copy'
  const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'flow' | 'popup'

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
      button: { ...prev.button, [key]: value }
    }));
  };

  // Update popup settings
  const updatePopupSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      popup: { ...prev.popup, [key]: value }
    }));
  };

  // Update add_to_cart_button settings
  const updateAddToCartButtonSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      add_to_cart_button: { ...prev.add_to_cart_button, [key]: value }
    }));
  };

  // Update entry_popup settings
  const updateEntryPopupSetting = (key, value) => {
    setSettings(prev => ({
      ...prev,
      entry_popup: { ...prev.entry_popup, [key]: value }
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

  // Quick theme application
  const applyTheme = (themeName) => {
    const themes = {
      teal: { primary: '#008060', header: '#0d1f18' },
      minimal: { primary: '#111827', header: '#0a0a0a' },
      rose: { primary: '#e11d48', header: '#1f080e' },
      violet: { primary: '#7c3aed', header: '#120a1f' },
      amber: { primary: '#d97706', header: '#1f1208' },
      navy: { primary: '#1e3a5f', header: '#081018' },
    };
    const t = themes[themeName];
    if (!t) return;

    setSettings(prev => ({
      ...prev,
      button: { ...prev.button, bg_color: t.primary },
      popup: { 
        ...prev.popup, 
        header_bg_color: t.primary,
        upload_btn_bg_color: t.primary,
        generate_btn_bg_color: t.primary 
      },
      entry_popup: { 
        ...prev.entry_popup, 
        bg_color: t.header,
        cta_bg_color: t.primary 
      }
    }));
  };

  const ColorCtrl = ({ label, sub, value, onChange, presets = [] }) => (
    <div className={styles.ctrlRowWrap}>
      <div className={styles.ctrlRow}>
        <div>
          <div className={styles.ctrlLabel}>{label}</div>
          {sub && <div className={styles.ctrlSub}>{sub}</div>}
        </div>
        <div className={styles.swatchWrap}>
          <div className={styles.swatch} style={{ background: value }}>
            <input type="color" value={value} onChange={e => onChange(e.target.value)} />
          </div>
          <input 
            className={styles.hexInput} 
            value={value}
            onChange={e => onChange(e.target.value)} 
            maxLength={7} 
          />
        </div>
      </div>
      {presets.length > 0 && (
        <div className={styles.presets}>
          {presets.map((hex, idx) => (
            <div 
              key={idx} 
              className={styles.presetDot} 
              style={{ background: hex }} 
              onClick={() => onChange(hex)} 
            />
          ))}
        </div>
      )}
    </div>
  );

  const s = settings;

  const currentTabSubtitles = {
    button: 'Try The Look Button',
    popup: 'Upload & Result Screen',
    entry_popup: 'Entry Teaser Popup'
  };

  return (
    <div className={styles.appContainer}>
      {/* ════════════════════════════
           SIDEBAR
      ════════════════════════════ */}
      <div className={styles.sidebar}>
        <div className={styles.sbHead}>
          <div className={styles.sbHeadIcon}>SBB</div>
          <div className={styles.sbHeadText}>
            <div className={styles.sbTitle}>Brand Customizer</div>
            <div className={styles.sbSub}>See Before Buy AI</div>
          </div>
        </div>

        {/* TOP-LEVEL FEATURE TABS */}
        <div className={styles.featureTabs}>
          <div className={styles.groupLabel}>Try The Look Flow</div>
          <button 
            className={`${styles.ftBtn} ${activeTab === 'button' ? styles.ftBtnActive : ''}`}
            onClick={() => setActiveTab('button')}
          >
            <div className={styles.ftIcon}>🖱</div>
            <div className={styles.ftLabel}>
              <div className={styles.ftTitle}>Try The Look Button</div>
              <div className={styles.ftSub}>Product page trigger</div>
            </div>
          </button>

          <button 
            className={`${styles.ftBtn} ${activeTab === 'popup' ? styles.ftBtnActive : ''}`}
            onClick={() => setActiveTab('popup')}
          >
            <div className={styles.ftIcon}>📸</div>
            <div className={styles.ftLabel}>
              <div className={styles.ftTitle}>Popup Modal</div>
              <div className={styles.ftSub}>Upload & preview screen</div>
            </div>
          </button>

          <div className={styles.ftDivider} />

          <div className={styles.groupLabel}>Entry Teaser</div>
          <button 
            className={`${styles.ftBtn} ${activeTab === 'entry_popup' ? styles.ftBtnActive : ''}`}
            onClick={() => setActiveTab('entry_popup')}
          >
            <div className={styles.ftIcon}>🔔</div>
            <div className={styles.ftLabel}>
              <div className={styles.ftTitle}>Entry Popup</div>
              <div className={styles.ftSub}>First-visit prompt</div>
            </div>
          </button>
        </div>

        {/* SECOND-LEVEL SUB TABS */}
        <div className={styles.subTabs}>
          <button 
            className={`${styles.stBtn} ${subTab === 'colors' ? styles.stBtnActive : ''}`}
            onClick={() => setSubTab('colors')}
          >Colors</button>
          <button 
            className={`${styles.stBtn} ${subTab === 'style' ? styles.stBtnActive : ''}`}
            onClick={() => setSubTab('style')}
          >Style</button>
          <button 
            className={`${styles.stBtn} ${subTab === 'copy' ? styles.stBtnActive : ''}`}
            onClick={() => setSubTab('copy')}
          >Copy</button>
        </div>

        {/* CONTROLS AREA */}
        <div className={styles.controlsArea}>

          {/* ════ COLORS SUB-TAB ════ */}
          {subTab === 'colors' && (
            <>
              <div className={styles.ctrlSection}>
                <div className={styles.csTitle}>Quick Themes</div>
                <div className={styles.themeGrid}>
                  <div className={styles.themeCard} onClick={() => applyTheme('teal')}>
                    <div className={styles.themeSwatch} style={{ background: '#008060' }} />
                    <span className={styles.themeName}>Default</span>
                  </div>
                  <div className={styles.themeCard} onClick={() => applyTheme('minimal')}>
                    <div className={styles.themeSwatch} style={{ background: '#111827' }} />
                    <span className={styles.themeName}>Minimal</span>
                  </div>
                  <div className={styles.themeCard} onClick={() => applyTheme('rose')}>
                    <div className={styles.themeSwatch} style={{ background: '#e11d48' }} />
                    <span className={styles.themeName}>Rose</span>
                  </div>
                  <div className={styles.themeCard} onClick={() => applyTheme('violet')}>
                    <div className={styles.themeSwatch} style={{ background: '#7c3aed' }} />
                    <span className={styles.themeName}>Violet</span>
                  </div>
                  <div className={styles.themeCard} onClick={() => applyTheme('amber')}>
                    <div className={styles.themeSwatch} style={{ background: '#d97706' }} />
                    <span className={styles.themeName}>Amber</span>
                  </div>
                  <div className={styles.themeCard} onClick={() => applyTheme('navy')}>
                    <div className={styles.themeSwatch} style={{ background: '#1e3a5f' }} />
                    <span className={styles.themeName}>Navy</span>
                  </div>
                </div>
              </div>

              {activeTab === 'button' && (
                <>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Main Button Colors</div>
                    <ColorCtrl 
                      label="Background color" 
                      sub="Primary CTA background"
                      value={s.button.bg_color} 
                      onChange={v => updateButtonSetting('bg_color', v)}
                      presets={['#008060', '#111827', '#e11d48', '#7c3aed', '#d97706', '#0891b2']}
                    />
                    <ColorCtrl 
                      label="Text color" 
                      sub="Primary CTA text"
                      value={s.button.text_color} 
                      onChange={v => updateButtonSetting('text_color', v)}
                      presets={['#FFFFFF', '#111111', '#F3F4F6']}
                    />
                  </div>

                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Add To Cart Colors</div>
                    <ColorCtrl 
                      label="Background color" 
                      value={s.add_to_cart_button.bg_color} 
                      onChange={v => updateAddToCartButtonSetting('bg_color', v)}
                    />
                    <ColorCtrl 
                      label="Text color" 
                      value={s.add_to_cart_button.text_color} 
                      onChange={v => updateAddToCartButtonSetting('text_color', v)}
                    />
                  </div>
                </>
              )}

              {activeTab === 'popup' && (
                <>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Header & Accent</div>
                    <ColorCtrl 
                      label="Header background" 
                      value={s.popup.header_bg_color} 
                      onChange={v => updatePopupSetting('header_bg_color', v)}
                      presets={['#008060', '#111827', '#7c3aed', '#1e3a5f']}
                    />
                  </div>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Upload Button Colors</div>
                    <ColorCtrl 
                      label="Background" 
                      value={s.popup.upload_btn_bg_color} 
                      onChange={v => updatePopupSetting('upload_btn_bg_color', v)}
                    />
                    <ColorCtrl 
                      label="Text color" 
                      value={s.popup.upload_btn_text_color} 
                      onChange={v => updatePopupSetting('upload_btn_text_color', v)}
                    />
                  </div>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Generate Button Colors</div>
                    <ColorCtrl 
                      label="Background" 
                      value={s.popup.generate_btn_bg_color} 
                      onChange={v => updatePopupSetting('generate_btn_bg_color', v)}
                    />
                    <ColorCtrl 
                      label="Text color" 
                      value={s.popup.generate_btn_text_color} 
                      onChange={v => updatePopupSetting('generate_btn_text_color', v)}
                    />
                  </div>
                </>
              )}

              {activeTab === 'entry_popup' && (
                <>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Entry Popup Dark Area</div>
                    <ColorCtrl 
                      label="Header dark background" 
                      value={s.entry_popup.bg_color} 
                      onChange={v => updateEntryPopupSetting('bg_color', v)}
                      presets={['#0D1F18', '#0A0A0A', '#120A1F', '#081018']}
                    />
                  </div>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>CTA Button Colors</div>
                    <ColorCtrl 
                      label="CTA button background" 
                      value={s.entry_popup.cta_bg_color} 
                      onChange={v => updateEntryPopupSetting('cta_bg_color', v)}
                    />
                    <ColorCtrl 
                      label="CTA text color" 
                      value={s.entry_popup.cta_text_color} 
                      onChange={v => updateEntryPopupSetting('cta_text_color', v)}
                    />
                  </div>
                </>
              )}
            </>
          )}
          {/* ════ STYLE SUB-TAB ════ */}
          {subTab === 'style' && (
            <>
              {activeTab === 'button' && (
                <>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Visibility</div>
                    <div className={styles.ctrlRow}>
                      <div>
                        <div className={styles.ctrlLabel}>Education banner</div>
                        <div className={styles.ctrlSub}>Show "Not sure how this'll look on you?" banner below product details</div>
                      </div>
                      <button
                        className={`${styles.toggle} ${s.button.show_education_banner ? styles.toggleOn : ''}`}
                        onClick={() => updateButtonSetting('show_education_banner', !s.button.show_education_banner)}
                      />
                    </div>

                    <div className={styles.ctrlRow} style={{ marginTop: 12 }}>
                      <div>
                        <div className={styles.ctrlLabel}>Button emoji icon</div>
                        <div className={styles.ctrlSub}>Show 📸 before the button text</div>
                      </div>
                      <button
                        className={`${styles.toggle} ${s.button.show_button_emoji ? styles.toggleOn : ''}`}
                        onClick={() => updateButtonSetting('show_button_emoji', !s.button.show_button_emoji)}
                      />
                    </div>
                  </div>

                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Button Corner Radius</div>
                    <div className={styles.radiusRow}>
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>Square</span>
                      <input 
                        type="range" 
                        className={styles.radiusSlider} 
                        min={0} 
                        max={28} 
                        value={s.button.border_radius}
                        onChange={e => updateButtonSetting('border_radius', parseInt(e.target.value))} 
                      />
                      <span style={{ fontSize: 10, color: 'var(--muted)' }}>Round</span>
                      <span className={styles.radiusVal}>{s.button.border_radius}px</span>
                    </div>
                    <div className={styles.radiusPresets}>
                      <button className={styles.rpBtn} onClick={() => updateButtonSetting('border_radius', 0)}>Square (0px)</button>
                      <button className={styles.rpBtn} onClick={() => updateButtonSetting('border_radius', 8)}>Soft (8px)</button>
                      <button className={styles.rpBtn} onClick={() => updateButtonSetting('border_radius', 28)}>Pill (28px)</button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'entry_popup' && (
                <div className={styles.ctrlSection}>
                  <div className={styles.csTitle}>Popup Settings</div>
                  <div className={styles.ctrlRow}>
                    <div>
                      <div className={styles.ctrlLabel}>Enable Entry Popup</div>
                      <div className={styles.ctrlSub}>Auto prompt on PDP</div>
                    </div>
                    <button 
                      className={`${styles.toggle} ${s.entry_popup.enabled ? styles.toggleOn : ''}`}
                      onClick={() => updateEntryPopupSetting('enabled', !s.entry_popup.enabled)} 
                    />
                  </div>

                  <div className={styles.ctrlRow} style={{ marginTop: 12 }}>
                    <div>
                      <div className={styles.ctrlLabel}>Auto-trigger Delay</div>
                      <div className={styles.ctrlSub}>Show after seconds</div>
                    </div>
                    <select 
                      className={styles.selInput}
                      value={s.entry_popup.delay_seconds}
                      onChange={e => updateEntryPopupSetting('delay_seconds', parseInt(e.target.value))}
                    >
                      {[2,3,4,5,7,10,15,20,30].map(d => (
                        <option key={d} value={d}>{d} seconds</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {(activeTab === 'popup' || activeTab === 'button') && (
                <div className={styles.ctrlSection}>
                  <div className={styles.csTitle}>Add to Cart Corner Radius</div>
                  <div className={styles.radiusRow}>
                    <input 
                      type="range" 
                      className={styles.radiusSlider} 
                      min={0} 
                      max={28} 
                      value={s.add_to_cart_button.border_radius}
                      onChange={e => updateAddToCartButtonSetting('border_radius', parseInt(e.target.value))} 
                    />
                    <span className={styles.radiusVal}>{s.add_to_cart_button.border_radius}px</span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════ COPY SUB-TAB ════ */}
          {subTab === 'copy' && (
            <>
              {activeTab === 'button' && (
                <>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Try The Look Button Text</div>
                    <input 
                      className={styles.textInput} 
                      value={s.button.text}
                      onChange={e => updateButtonSetting('text', e.target.value)} 
                      placeholder="e.g. Try The Look"
                    />
                    <div className={styles.chips}>
                      {['Try The Look', 'See Before You Buy', 'Virtual Try-On', 'See it on me'].map(text => (
                        <span key={text} className={styles.chip} onClick={() => updateButtonSetting('text', text)}>
                          {text}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Add To Cart Button Text</div>
                    <input 
                      className={styles.textInput} 
                      value={s.add_to_cart_button.text}
                      onChange={e => updateAddToCartButtonSetting('text', e.target.value)} 
                      placeholder="e.g. Add to Cart"
                    />
                  </div>
                </>
              )}

              {activeTab === 'popup' && (
                <>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Popup Title</div>
                    <input 
                      className={styles.textInput} 
                      value={s.popup.title}
                      onChange={e => updatePopupSetting('title', e.target.value)} 
                    />
                  </div>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Upload Button Text</div>
                    <input 
                      className={styles.textInput} 
                      value={s.popup.upload_button_text}
                      onChange={e => updatePopupSetting('upload_button_text', e.target.value)} 
                    />
                  </div>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Generate Button Text</div>
                    <input 
                      className={styles.textInput} 
                      value={s.popup.generate_button_text}
                      onChange={e => updatePopupSetting('generate_button_text', e.target.value)} 
                    />
                  </div>
                </>
              )}

              {activeTab === 'entry_popup' && (
                <>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Popup headline</div>
                    <input 
                      className={styles.textInput} 
                      value={s.entry_popup.heading_text}
                      onChange={e => updateEntryPopupSetting('heading_text', e.target.value)} 
                    />
                  </div>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Popup description</div>
                    <textarea 
                      className={styles.textAreaInput} 
                      rows={3}
                      value={s.entry_popup.sub_text}
                      onChange={e => updateEntryPopupSetting('sub_text', e.target.value)} 
                    />
                  </div>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Popup button</div>
                    <input 
                      className={styles.textInput} 
                      value={s.entry_popup.cta_text}
                      onChange={e => updateEntryPopupSetting('cta_text', e.target.value)} 
                    />
                  </div>
                  <div className={styles.ctrlSection}>
                    <div className={styles.csTitle}>Dismiss Text</div>
                    <input 
                      className={styles.textInput} 
                      value={s.entry_popup.dismiss_text}
                      onChange={e => updateEntryPopupSetting('dismiss_text', e.target.value)} 
                    />
                  </div>
                </>
              )}
            </>
          )}

        </div>





        {/* SAVE & RESET ACTIONS */}
        <div className={styles.actionWrap}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={isSaving}>
            {isSaving ? '⏳ Saving...' : '✓ Save & Publish'}
          </button>
          <div className={styles.resetLink} onClick={handleReset}>Reset to default settings</div>
        </div>
      </div>

      {/* ════════════════════════════
           MAIN PREVIEW AREA
      ════════════════════════════ */}
      <div className={styles.mainArea}>

        {/* TOP BAR */}
        <div className={styles.topBar}>
          <div>
            <div className={styles.tbTitle}>Live Preview</div>
            <div className={styles.tbSub}>Customizing: {currentTabSubtitles[activeTab]}</div>
          </div>
          <div className={styles.tbRight}>
            <div className={styles.viewTabs}>
              <button 
                className={`${styles.vtBtn} ${viewFilter === 'all' ? styles.vtBtnActive : ''}`}
                onClick={() => setViewFilter('all')}
              >All</button>
              <button 
                className={`${styles.vtBtn} ${viewFilter === 'flow' ? styles.vtBtnActive : ''}`}
                onClick={() => setViewFilter('flow')}
              >Try The Look Flow</button>
              <button 
                className={`${styles.vtBtn} ${viewFilter === 'popup' ? styles.vtBtnActive : ''}`}
                onClick={() => setViewFilter('popup')}
              >Entry Popup</button>
            </div>
            <div className={styles.liveBadge}>
              <span className={styles.liveDot} />
              Live Preview
            </div>
          </div>
        </div>

        {/* PREVIEWS CONTAINER */}
        <div className={styles.previewContainer}>

          {/* ── SECTION 1: TRY THE LOOK FLOW ── */}
          {(viewFilter === 'all' || viewFilter === 'flow') && (
            <div>
              <div className={styles.sectionLabel}>
                <div className={styles.slBadge}>🖱 Try The Look Flow</div>
                <div className={styles.slLine} />
                <div className={styles.slDesc}>Appears on the Product Detail Page</div>
              </div>

              <div className={styles.previewGrid}>

                {/* PDP BUTTON CARD */}
                <div className={styles.previewPanel}>
                  <div className={styles.ppHead}>
                    <span className={styles.ppTitle}>① Try The Look Button</span>
                    <span className={styles.ppBadge}>Product Page</span>
                  </div>
                  <div className={styles.ppBody}>
                    <div className={styles.fakePage}>
                      <div className={styles.fpImgWrap}>
                        {previewProduct?.image ? (
                          <img src={previewProduct.image} alt={previewProduct.imageAlt} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#EAF5EF,#d1fae5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>👗</div>
                        )}
                      </div>
                      <div className={styles.fpName}>{previewProduct?.title || 'Sample Product'}</div>
                      <div className={styles.fpPrice}>{previewProduct?.price || '—'}</div>
                      <button className={styles.fpAtc} style={{
                        background: s.add_to_cart_button.bg_color,
                        color: s.add_to_cart_button.text_color,
                        borderRadius: `${s.add_to_cart_button.border_radius}px`,
                      }}>
                        {s.add_to_cart_button.text || 'Add to Cart'}
                      </button>
                      <button className={styles.brandBtn} style={{
                        background: s.button.bg_color,
                        color: s.button.text_color,
                        borderRadius: `${s.button.border_radius}px`,
                      }}>
                        {s.button.show_button_emoji ? '📸 ' : ''}{s.button.text || 'See Before You Buy'}
                      </button>
                      {s.button.show_education_banner && (
                        <div className={styles.eduBanner} style={{
                          background: `${s.button.bg_color}10`,
                          borderColor: `${s.button.bg_color}30`
                        }}>
                          <div className={styles.ebIcon} style={{ background: s.button.bg_color }}>{s.button.show_button_emoji ? '📸' : '✓'}</div>
                          <div>
                            <div className={styles.ebTitle}>Not sure how this'll look on you?</div>
                            <div className={styles.ebSub}>Upload photo → see yourself in 30 seconds</div>
                          </div>
                        </div> 
                      )}
                    </div>
                  </div>
                </div>

                {/* UPLOAD MODAL CARD */}
                <div className={styles.previewPanel}>
                  <div className={styles.ppHead}>
                    <span className={styles.ppTitle}>② Upload Screen</span>
                    <span className={styles.ppBadge}>Screen 1</span>
                  </div>
                  <div className={styles.ppBody}>
                    <div className={styles.uploadModal}>
                      <div className={styles.umTop}>
                        <div>
                          <div className={styles.umTitle}>{s.popup.title || 'Try The Look'}</div>
                          <div className={styles.umSub}>See how it looks on you</div>
                        </div>
                        <button className={styles.umClose}>✕</button>
                      </div>
                      <div className={styles.umProductBar}>
                        <div className={styles.umThumb}>
                          <img src={previewProduct.image} alt="" />
                        </div>
                        <div>
                          <div className={styles.umPname}>{previewProduct?.title}</div>
                          <div className={styles.umCat} style={{ color: s.popup.header_bg_color }}>{previewProduct?.price || '—'}</div>
                        </div>
                      </div>
                      <div className={styles.umBody}>
                        <div className={styles.umAiBadge} style={{
                          background: `${s.popup.header_bg_color}18`,
                          borderColor: `${s.popup.header_bg_color}30`,
                          color: s.popup.header_bg_color,
                        }}>✦ AI PREVIEW</div>
                        <div className={styles.umMain}>SEE IT ON YOU IN SECONDS</div>
                        <div className={styles.umTip}>Upload a front-facing photo from the same angle as the product.</div>
                        <button className={styles.umUploadBtn} style={{
                          background: s.popup.upload_btn_bg_color,
                          color: s.popup.upload_btn_text_color,
                          borderRadius: `${s.button.border_radius}px`,
                        }}>
                          ↑ {s.popup.upload_button_text || 'Upload Your Photo'}
                        </button>
                        <div className={styles.umTipsGrid}>
                          <div className={styles.umChip}><span>📏</span>Full body</div>
                          <div className={styles.umChip}><span>☀️</span>Good lighting</div>
                          <div className={styles.umChip}><span>👁</span>Face camera</div>
                          <div className={styles.umChip}><span>📐</span>Stand straight</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RESULT CHECKLIST CARD */}
                <div className={styles.previewPanel}>
                  <div className={styles.ppHead}>
                    <span className={styles.ppTitle}>③ Result Screen</span>
                    <span className={styles.ppBadge}>Screen 2</span>
                  </div>
                  <div className={styles.ppBody}>
                    <div className={styles.checklistCard}>
                      <div className={styles.lcTop}>
                        <div className={styles.lcTitle}>{s.popup.title}</div>
                        <div className={styles.lcSub} style={{ color: s.popup.header_bg_color }}>Finalizing quality...</div>
                      </div>
                      {[
                        { title: 'Fabric texture applied', sub: 'Folds and weight rendered' },
                        { title: 'Print reproduced', sub: 'Graphic placed accurately' },
                        { title: 'Lighting matched', sub: 'Ambient light blended' },
                        { title: 'Face preserved', sub: 'Confirming face is unchanged' },
                      ].map((item, idx) => (
                        <div key={idx} className={styles.clItem} style={{
                          background: `${s.popup.header_bg_color}0d`,
                          borderColor: `${s.popup.header_bg_color}1a`
                        }}>
                          <div className={styles.clCheck} style={{ background: s.popup.header_bg_color }}>✓</div>
                          <div>
                            <div className={styles.clT}>{item.title}</div>
                            <div className={styles.clS}>{item.sub}</div>
                          </div>
                          <div className={styles.clDone} style={{ color: s.popup.header_bg_color }}>done</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button style={{
                        width: '100%',
                        background: s.popup.generate_btn_bg_color,
                        color: s.popup.generate_btn_text_color,
                        border: 'none',
                        borderRadius: `${s.button.border_radius}px`,
                        padding: '12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}>
                        {s.popup.generate_button_text || 'Generate Preview'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ── SECTION 2: ENTRY POPUP ── */}
          {(viewFilter === 'all' || viewFilter === 'popup') && (
            <div style={{ marginTop: 24 }}>
              <div className={styles.sectionLabel}>
                <div className={styles.slBadge}>🔔 Entry Popup</div>
                <div className={styles.slLine} />
                <div className={styles.slDesc}>
                  Auto-appears after {s.entry_popup.delay_seconds}s on initial visit
                  {!s.entry_popup.enabled && <span className={styles.disabledBadge}> (DISABLED)</span>}
                </div>
              </div>

              <div className={styles.previewGrid}>
                <div className={styles.previewPanel} style={{ maxWidth: 320 }}>
                  <div className={styles.ppHead}>
                    <span className={styles.ppTitle}>④ Entry Teaser Popup</span>
                    <span className={styles.ppBadge}>Auto Trigger</span>
                  </div>
                  <div className={styles.ppBody}>
                    <div className={styles.entryPopupCard}>
                      <div className={styles.epHeader} style={{ background: s.entry_popup.bg_color }}>
                        <button className={styles.epClose}>✕</button>
                        <div className={styles.epCards}>
                          <div className={styles.epCardProduct}>
                            <img src={previewProduct.image} alt="" />
                          </div>
                          <div className={styles.epMerge} style={{ background: s.button.bg_color }}>✦</div>
                          <div className={styles.epCardRight}>
                            <div className={styles.epRightInner}>
                              <div className={styles.epCam} style={{ background: s.button.bg_color }}>📸</div>
                              <div className={styles.epRightLabel}>your photo</div>
                            </div>
                          </div>
                        </div>
                        <div className={styles.epStrip} style={{
                          background: `${s.button.bg_color}20`,
                          borderColor: `${s.button.bg_color}40`,
                        }}>
                          <div className={styles.epStripThumb}>
                            <img src={previewProduct.image} alt="" />
                          </div>
                          <div>
                            <div className={styles.epStripTitle}>See yourself wearing it</div>
                            <div className={styles.epStripSub}>Before you add to cart</div>
                          </div>
                          <div className={styles.epStripBadge} style={{ background: s.button.bg_color }}>NEW ✦</div>
                        </div>
                        <div className={styles.epTrust}>Results ready in under 30 seconds</div>
                      </div>

                      <div className={styles.epBody}>
                        <div className={styles.epTitle}>{s.entry_popup.heading_text}</div>
                        <div className={styles.epDesc}>{s.entry_popup.sub_text}</div>
                        <button className={styles.epCta} style={{
                          background: s.entry_popup.cta_bg_color,
                          color: s.entry_popup.cta_text_color,
                          borderRadius: `${s.button.border_radius}px`,
                        }}>
                          {s.entry_popup.cta_text}
                        </button>
                        <button className={styles.epSkip}>{s.entry_popup.dismiss_text}</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}