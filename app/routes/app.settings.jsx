import { useState, useEffect } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import styles from "./app.settings/settings.module.css";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  console.log('⚙️  Settings page loaded for:', shopDomain);

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
    console.error('❌ Error fetching settings:', error);
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
    }
  };

  // State for settings
  const [activeTab, setActiveTab] = useState('button'); // 'button' or 'popup'
  const [settings, setSettings] = useState(() => {
    // Merge loaded settings with defaults to ensure all fields exist
    const loadedSettings = loaderData.settings || {};
    return {
      button: {
        ...defaultSettings.button,
        ...(loadedSettings.button || {})
      },
      popup: {
        ...defaultSettings.popup,
        ...(loadedSettings.popup || {})
      },
      add_to_cart_button: {
        ...defaultSettings.add_to_cart_button,
        ...(loadedSettings.add_to_cart_button || {})
      }
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

  return (
    <s-page heading="Settings">
      <div className={styles.settingsContainer}>

       
        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'button' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('button')}
          >
            Button Settings
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'popup' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('popup')}
          >
            Popup Settings
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          
          {/* Settings Form */}
          <div className={styles.settingsForm}>
            
            {/* Button Settings Tab */}
            {activeTab === 'button' && (
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Button Customization</h2>
                <p className={styles.sectionSubtitle}>
                  Customize the "See Before You Buy" button that appears on your product pages.
                </p>

                {/* Button Text */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Button Text</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={settings.button.text}
                    onChange={(e) => updateButtonSetting('text', e.target.value)}
                    placeholder="See Before You Buy"
                  />
                </div>

                {/* Background Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Background Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.button.bg_color}
                      onChange={(e) => updateButtonSetting('bg_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.button.bg_color}
                      onChange={(e) => updateButtonSetting('bg_color', e.target.value)}
                      placeholder="#329580"
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Text Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.button.text_color}
                      onChange={(e) => updateButtonSetting('text_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.button.text_color}
                      onChange={(e) => updateButtonSetting('text_color', e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                {/* Border Radius */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Border Radius: {settings.button.border_radius}px
                  </label>
                  <input
                    type="range"
                    className={styles.slider}
                    min="0"
                    max="20"
                    value={settings.button.border_radius}
                    onChange={(e) => updateButtonSetting('border_radius', parseInt(e.target.value))}
                  />
                </div>

                {/* Button Size */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Button Size</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="buttonSize"
                        value="small"
                        checked={settings.button.size === 'small'}
                        onChange={(e) => updateButtonSetting('size', e.target.value)}
                      />
                      Small
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="buttonSize"
                        value="medium"
                        checked={settings.button.size === 'medium'}
                        onChange={(e) => updateButtonSetting('size', e.target.value)}
                      />
                      Medium
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="buttonSize"
                        value="large"
                        checked={settings.button.size === 'large'}
                        onChange={(e) => updateButtonSetting('size', e.target.value)}
                      />
                      Large
                    </label>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop: '2px solid #E5E7EB', margin: '32px 0', paddingTop: '32px' }}>
                  <h3 className={styles.sectionTitle} style={{ fontSize: '18px', marginBottom: '8px' }}>
                    Add to Cart Button
                  </h3>
                  <p className={styles.sectionSubtitle}>
                    Customize the "Add to Cart" button that appears after the AI preview is generated.
                  </p>
                </div>

                {/* Add to Cart Button Text */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Add to Cart Button Text</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={settings.add_to_cart_button.text}
                    onChange={(e) => updateAddToCartButtonSetting('text', e.target.value)}
                    placeholder="Add to Cart"
                  />
                </div>

                {/* Add to Cart Background Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Add to Cart Background Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.add_to_cart_button.bg_color}
                      onChange={(e) => updateAddToCartButtonSetting('bg_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.add_to_cart_button.bg_color}
                      onChange={(e) => updateAddToCartButtonSetting('bg_color', e.target.value)}
                      placeholder="#2a7f6d"
                    />
                  </div>
                </div>

                {/* Add to Cart Text Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Add to Cart Text Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.add_to_cart_button.text_color}
                      onChange={(e) => updateAddToCartButtonSetting('text_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.add_to_cart_button.text_color}
                      onChange={(e) => updateAddToCartButtonSetting('text_color', e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                {/* Add to Cart Border Radius */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Add to Cart Border Radius: {settings.add_to_cart_button.border_radius}px
                  </label>
                  <input
                    type="range"
                    className={styles.slider}
                    min="0"
                    max="20"
                    value={settings.add_to_cart_button.border_radius}
                    onChange={(e) => updateAddToCartButtonSetting('border_radius', parseInt(e.target.value))}
                  />
                </div>

                {/* Add to Cart Button Size */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Add to Cart Button Size</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="addToCartButtonSize"
                        value="small"
                        checked={settings.add_to_cart_button.size === 'small'}
                        onChange={(e) => updateAddToCartButtonSetting('size', e.target.value)}
                      />
                      Small
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="addToCartButtonSize"
                        value="medium"
                        checked={settings.add_to_cart_button.size === 'medium'}
                        onChange={(e) => updateAddToCartButtonSetting('size', e.target.value)}
                      />
                      Medium
                    </label>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="addToCartButtonSize"
                        value="large"
                        checked={settings.add_to_cart_button.size === 'large'}
                        onChange={(e) => updateAddToCartButtonSetting('size', e.target.value)}
                      />
                      Large
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Popup Settings Tab */}
            {activeTab === 'popup' && (
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>Popup Customization</h2>
                <p className={styles.sectionSubtitle}>
                  Customize the popup modal that appears when customers click the button.
                </p>

                {/* ── HEADER ── */}
                <h3 className={styles.subSectionTitle}>Header</h3>

                {/* Popup Title */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Popup Title</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={settings.popup.title}
                    onChange={(e) => updatePopupSetting('title', e.target.value)}
                    placeholder="See Yourself in This Look"
                  />
                </div>

                {/* Header Background Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Header Background Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.popup.header_bg_color}
                      onChange={(e) => updatePopupSetting('header_bg_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.popup.header_bg_color}
                      onChange={(e) => updatePopupSetting('header_bg_color', e.target.value)}
                      placeholder="#329580"
                    />
                  </div>
                </div>

                {/* ── POPUP BODY ── */}
                <div className={styles.subSectionDivider} />
                <h3 className={styles.subSectionTitle}>Popup Body</h3>

                {/* Background Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Background Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.popup.bg_color}
                      onChange={(e) => updatePopupSetting('bg_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.popup.bg_color}
                      onChange={(e) => updatePopupSetting('bg_color', e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Text Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.popup.text_color}
                      onChange={(e) => updatePopupSetting('text_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.popup.text_color}
                      onChange={(e) => updatePopupSetting('text_color', e.target.value)}
                      placeholder="#000000"
                    />
                  </div>
                </div>

                {/* Border Radius */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Border Radius: {settings.popup.border_radius}px
                  </label>
                  <input
                    type="range"
                    className={styles.slider}
                    min="0"
                    max="20"
                    value={settings.popup.border_radius}
                    onChange={(e) => updatePopupSetting('border_radius', parseInt(e.target.value))}
                  />
                </div>

                {/* ── UPLOAD AREA ── */}
                <div className={styles.subSectionDivider} />
                <h3 className={styles.subSectionTitle}>Upload Area</h3>

                {/* Upload Area Background */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Upload Area Background Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.popup.upload_area_bg_color}
                      onChange={(e) => updatePopupSetting('upload_area_bg_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.popup.upload_area_bg_color}
                      onChange={(e) => updatePopupSetting('upload_area_bg_color', e.target.value)}
                      placeholder="#F6F6F7"
                    />
                  </div>
                </div>

                {/* ── UPLOAD BUTTON ── */}
                <div className={styles.subSectionDivider} />
                <h3 className={styles.subSectionTitle}>Upload Photo Button</h3>

                {/* Upload Button Text */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Upload Button Text</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={settings.popup.upload_button_text}
                    onChange={(e) => updatePopupSetting('upload_button_text', e.target.value)}
                    placeholder="Upload Your Photo"
                  />
                </div>

                {/* Upload Button Background */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Upload Button Background Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.popup.upload_btn_bg_color}
                      onChange={(e) => updatePopupSetting('upload_btn_bg_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.popup.upload_btn_bg_color}
                      onChange={(e) => updatePopupSetting('upload_btn_bg_color', e.target.value)}
                      placeholder="#329580"
                    />
                  </div>
                </div>

                {/* Upload Button Text Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Upload Button Text Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.popup.upload_btn_text_color}
                      onChange={(e) => updatePopupSetting('upload_btn_text_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.popup.upload_btn_text_color}
                      onChange={(e) => updatePopupSetting('upload_btn_text_color', e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>

                {/* ── GENERATE BUTTON ── */}
                <div className={styles.subSectionDivider} />
                <h3 className={styles.subSectionTitle}>Generate Preview Button</h3>

                {/* Generate Button Text */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Generate Button Text</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={settings.popup.generate_button_text}
                    onChange={(e) => updatePopupSetting('generate_button_text', e.target.value)}
                    placeholder="Generate Preview"
                  />
                </div>

                {/* Generate Button Background */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Generate Button Background Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.popup.generate_btn_bg_color}
                      onChange={(e) => updatePopupSetting('generate_btn_bg_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.popup.generate_btn_bg_color}
                      onChange={(e) => updatePopupSetting('generate_btn_bg_color', e.target.value)}
                      placeholder="#329580"
                    />
                  </div>
                </div>

                {/* Generate Button Text Color */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Generate Button Text Color</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      className={styles.colorPicker}
                      value={settings.popup.generate_btn_text_color}
                      onChange={(e) => updatePopupSetting('generate_btn_text_color', e.target.value)}
                    />
                    <input
                      type="text"
                      className={styles.colorText}
                      value={settings.popup.generate_btn_text_color}
                      onChange={(e) => updatePopupSetting('generate_btn_text_color', e.target.value)}
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className={styles.actions}>
              <button
                className={styles.resetButton}
                onClick={handleReset}
                disabled={isSaving}
              >
                Reset to Defaults
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Live Preview */}
          <div className={styles.preview}>
            <h3 className={styles.previewTitle}>Live Preview</h3>
            
            {activeTab === 'button' && (
              <div className={styles.previewContent}>
                <p className={styles.previewLabel}>Trigger Button Preview:</p>
                {/* Actual trigger button replica */}
                <button style={{
                  width: '100%',
                  padding: settings.button.size === 'small' ? '10px 20px' : settings.button.size === 'large' ? '18px 28px' : '14px 24px',
                  fontSize: settings.button.size === 'small' ? '13px' : settings.button.size === 'large' ? '17px' : '15px',
                  fontWeight: 700,
                  fontFamily: "'Poppins', -apple-system, sans-serif",
                  background: settings.button.bg_color,
                  color: settings.button.text_color,
                  border: 'none',
                  borderRadius: `${settings.button.border_radius}px`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}>
                  {settings.button.text || 'Try The Look'}
                </button>

                <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid #E5E7EB' }}>
                  <p className={styles.previewLabel}>Add to Cart Button Preview:</p>
                  {/* Actual ATC button replica — shown inside the result sheet */}
                  <div style={{
                    background: '#111111',
                    borderRadius: '16px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    maxWidth: 340,
                  }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{
                        flex: 1,
                        background: settings.add_to_cart_button.bg_color,
                        color: settings.add_to_cart_button.text_color,
                        border: 'none',
                        borderRadius: `${settings.add_to_cart_button.border_radius}px`,
                        padding: settings.add_to_cart_button.size === 'small' ? '8px' : settings.add_to_cart_button.size === 'large' ? '16px' : '12px',
                        fontWeight: 700,
                        fontSize: settings.add_to_cart_button.size === 'small' ? '11px' : settings.add_to_cart_button.size === 'large' ? '15px' : '13px',
                        fontFamily: "'Poppins', -apple-system, sans-serif",
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}>
                        🛒 {settings.add_to_cart_button.text || 'Add to Cart'}
                      </button>
                      <div style={{ width: 44, height: 44, background: '#F6F6F7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⬇</div>
                      <div style={{ width: 44, height: 44, background: '#F6F6F7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>↗</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Shown on the result screen after AI preview is generated</p>
                </div>
              </div>
            )}

            {activeTab === 'popup' && (
              <div className={styles.previewContent}>
                <p className={styles.previewLabel}>Popup Preview:</p>

                {/* ── Accurate replica of the actual popup modal ── */}
                <div style={{
                  width: '100%',
                  maxWidth: '340px',
                  margin: '0 auto',
                  borderRadius: `${settings.popup.border_radius}px`,
                  overflow: 'hidden',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                  fontFamily: "'Poppins', -apple-system, sans-serif",
                  background: settings.popup.bg_color,
                  color: settings.popup.text_color,
                  border: '1px solid #E5E7EB',
                }}>

                  {/* Header */}
                  <div style={{
                    background: settings.popup.header_bg_color,
                    padding: '14px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>←</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '13px', lineHeight: 1.2 }}>{settings.popup.title || 'Try The Look'}</div>
                        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '9px', marginTop: 1 }}>See how it looks on you</div>
                      </div>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', cursor: 'pointer' }}>×</div>
                  </div>

                  {/* Product strip */}
                  <div style={{
                    margin: '12px 14px 0',
                    background: '#f8f9fa',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: '1px solid #E5E7EB',
                  }}>
                    <div style={{ width: 44, height: 56, borderRadius: '8px', background: 'linear-gradient(135deg, #f0f4ff, #EAF5EF)', flexShrink: 0, border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>👗</div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#111', marginBottom: 2 }}>Product Name</div>
                      <div style={{ fontSize: '9px', color: '#6B7280' }}>Virtual try-on · <strong style={{ color: '#008060' }}>AI Try-On</strong></div>
                    </div>
                  </div>

                  {/* Ready label */}
                  <div style={{ textAlign: 'center', padding: '16px 14px 0' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 999, background: 'rgba(0,128,96,0.12)', color: '#008060', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>AI Preview</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: settings.popup.text_color || '#111', marginBottom: 4, letterSpacing: '-0.02em' }}>See it on you in seconds</div>
                    <div style={{ fontSize: '10px', color: '#6B7280', lineHeight: 1.5 }}>Upload a clear photo and we'll create a live preview</div>
                  </div>

                  {/* Upload area */}
                  <div style={{
                    background: settings.popup.upload_area_bg_color,
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    margin: '12px 14px 0',
                  }}>
                    {/* Upload button */}
                    <button style={{
                      width: '100%',
                      background: settings.popup.upload_btn_bg_color,
                      color: settings.popup.upload_btn_text_color,
                      border: 'none',
                      borderRadius: '10px',
                      padding: '11px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 3px 10px rgba(0,128,96,0.2)',
                    }}>
                      <span>⬆</span> {settings.popup.upload_button_text || 'Choose Your Photo'}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: 6, fontSize: '9px', color: '#6B7280' }}>PNG or JPG • clear light • full body works best</div>
                  </div>

                  {/* Generate button */}
                  <div style={{ padding: '10px 14px' }}>
                    <button style={{
                      width: '100%',
                      background: settings.popup.generate_btn_bg_color,
                      color: settings.popup.generate_btn_text_color,
                      border: 'none',
                      borderRadius: '10px',
                      padding: '11px',
                      fontWeight: 700,
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 3px 10px rgba(0,128,96,0.2)',
                    }}>
                      <span>✦</span> {settings.popup.generate_button_text || 'Generate Preview'}
                    </button>
                  </div>

                  {/* Tips */}
                  <div style={{ padding: '0 14px 14px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#9CA3AF', textAlign: 'center', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tips for best results</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {['Full body photo', 'Good lighting', 'Stand straight', 'Front-facing'].map(tip => (
                        <div key={tip} style={{ background: '#f8f9fa', border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 8px', fontSize: '9px', color: '#555', textAlign: 'center' }}>{tip}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


      </div>

       <div style={{ textAlign: "center", marginTop: "32px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}>
          How to Add the Try-On Block to Your Product Pages
        </h3>
        <video
          src="https://cdn.shopify.com/videos/c/o/v/a071b075afb8477b94f7cf9c9d232957.mp4"
          controls
          style={{ maxWidth: "600px", width: "100%", borderRadius: "8px" }}
        />
      </div>
        
    </s-page>
  );
}
