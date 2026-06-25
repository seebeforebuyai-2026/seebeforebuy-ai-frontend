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
                <p className={styles.previewLabel}>Button Preview:</p>
                <button
                  className={styles.previewButton}
                  style={{
                    backgroundColor: settings.button.bg_color,
                    color: settings.button.text_color,
                    borderRadius: `${settings.button.border_radius}px`,
                    padding: settings.button.size === 'small' ? '8px 16px' : 
                             settings.button.size === 'large' ? '16px 32px' : '12px 24px',
                    fontSize: settings.button.size === 'small' ? '14px' : 
                              settings.button.size === 'large' ? '18px' : '16px',
                  }}
                >
                  {settings.button.text}
                </button>

                <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid #E5E7EB' }}>
                  <p className={styles.previewLabel}>Add to Cart Button Preview:</p>
                  <button
                    className={styles.previewButton}
                    style={{
                      backgroundColor: settings.add_to_cart_button.bg_color,
                      color: settings.add_to_cart_button.text_color,
                      borderRadius: `${settings.add_to_cart_button.border_radius}px`,
                      padding: settings.add_to_cart_button.size === 'small' ? '8px 16px' : 
                               settings.add_to_cart_button.size === 'large' ? '16px 32px' : '12px 24px',
                      fontSize: settings.add_to_cart_button.size === 'small' ? '14px' : 
                                settings.add_to_cart_button.size === 'large' ? '18px' : '16px',
                    }}
                  >
                    {settings.add_to_cart_button.text}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'popup' && (
              <div className={styles.previewContent}>
                <p className={styles.previewLabel}>Popup Preview:</p>
                <div
                  className={styles.previewPopup}
                  style={{
                    backgroundColor: settings.popup.bg_color,
                    color: settings.popup.text_color,
                    borderRadius: `${settings.popup.border_radius}px`,
                    overflow: 'hidden',
                    padding: 0,
                  }}
                >
                  {/* Header */}
                  <div style={{
                    background: `linear-gradient(135deg, ${settings.popup.header_bg_color} 0%, ${settings.popup.header_bg_color}cc 100%)`,
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{settings.popup.title}</span>
                    <span style={{ color: '#fff', fontSize: '20px', cursor: 'pointer' }}>×</span>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{
                      background: settings.popup.upload_area_bg_color,
                      border: '2px dashed #D1D5DB',
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center',
                      color: settings.popup.text_color,
                      fontSize: '13px',
                    }}>
                      📸 Upload Area
                    </div>
                    <button style={{
                      background: settings.popup.upload_btn_bg_color,
                      color: settings.popup.upload_btn_text_color,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}>
                      {settings.popup.upload_button_text}
                    </button>
                    <button style={{
                      background: settings.popup.generate_btn_bg_color,
                      color: settings.popup.generate_btn_text_color,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '10px',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}>
                      {settings.popup.generate_button_text}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </s-page>
  );
}
