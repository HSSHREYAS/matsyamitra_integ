/**
 * Translations Dictionary — Coastal Kannada (ಕರಾವಳಿ ಕನ್ನಡ) & English
 * Authentic local marine dialect terms spoken across Karwar, Udupi, and Mangalore.
 */

export type Language = 'en' | 'kn';

export interface Translations {
  // Navigation tabs
  tab_home: string;
  tab_map: string;
  tab_alerts: string;
  tab_profile: string;

  // Top Bar & Connectivity
  app_name: string;
  app_subtitle: string;
  greeting_morning: string;
  greeting_afternoon: string;
  greeting_evening: string;
  user_full_name: string;
  banner_slogan_kn: string;
  banner_slogan_en: string;
  current_conditions: string;
  safe_to_fish: string;
  caution_to_fish: string;
  unsafe_to_fish: string;
  view_all: string;
  badge_pro: string;
  live_connected: string;
  offline_cached: string;
  connecting: string;

  // Weather Card & Metrics
  wind_speed: string;
  wave_height: string;
  humidity: string;
  sea_temp: string;
  chlorophyll: string;
  updated_ago: string;
  km_per_hour: string;
  meters: string;

  // Weather Condition Badges
  cond_clear_calm: string;
  cond_moderate: string;
  cond_rough_sea: string;
  cond_high_wind: string;
  cond_favorable: string;
  cond_caution: string;
  cond_dangerous: string;

  // Fishing Advisory
  advisory_title: string;
  advisory_official: string;
  advisory_view_map: string;
  advisory_none_active: string;
  advisory_safe_notice: string;
  advisory_loading: string;
  advisory_view_more: string;
  advisory_show_less: string;

  // Quick Action Cards
  qa_fleet: string;
  qa_catch: string;
  qa_distress: string;
  qa_equipment: string;

  // Catch Logs Modal
  cl_title: string;
  cl_subtitle: string;
  cl_new_entry: string;
  cl_history: string;
  cl_select_species: string;
  cl_custom_species: string;
  cl_weight_kg: string;
  cl_rate_per_kg: string;
  cl_notes: string;
  cl_btn_save: string;
  cl_total_weight: string;
  cl_total_revenue: string;
  cl_no_records: string;
  cl_delete_confirm: string;

  // Marine Species (Coastal Dialect)
  species_mackerel: string;
  species_sardine: string;
  species_kingfish: string;
  species_pomfret: string;
  species_tuna: string;
  species_prawn: string;
  species_squid: string;

  // Distress / SOS Modal
  sos_title: string;
  sos_subtitle: string;
  sos_position_beacon: string;
  sos_latitude: string;
  sos_longitude: string;
  sos_broadcast_btn: string;
  sos_broadcast_sub: string;
  sos_helpline_heading: string;
  sos_coast_guard: string;
  sos_coast_guard_sub: string;
  sos_coastal_police: string;
  sos_coastal_police_sub: string;
  sos_emergency_112: string;
  sos_emergency_112_sub: string;
  sos_call_btn: string;
  sos_2g_notice: string;

  // Equipment Checklist Modal
  eq_title: string;
  eq_subtitle: string;
  eq_readiness_title: string;
  eq_ready_to_sail: string;
  eq_attention_required: string;
  eq_safety_count: string;
  eq_reset_btn: string;
  eq_item_life_jackets: string;
  eq_item_life_jackets_desc: string;
  eq_item_vhf: string;
  eq_item_vhf_desc: string;
  eq_item_gps: string;
  eq_item_gps_desc: string;
  eq_item_flares: string;
  eq_item_flares_desc: string;
  eq_item_fuel_water: string;
  eq_item_fuel_water_desc: string;
  eq_item_first_aid: string;
  eq_item_first_aid_desc: string;
  eq_item_anchor: string;
  eq_item_anchor_desc: string;

  // Fleet Tracking Modal
  ft_title: string;
  ft_subtitle: string;
  ft_boats_reporting: string;
  ft_in_fishing_zones: string;
  ft_ports_covered: string;
  ft_zone_distance: string;
  ft_crowd_notice: string;
  ft_harbor_status_title: string;
  ft_vessels_registered: string;
  ft_vessels_offshore: string;
  density_low: string;
  density_moderate: string;
  density_high: string;

  // Location Selector
  loc_select_title: string;
  loc_search_placeholder: string;
  loc_active_badge: string;

  // Alerts & Notices Screen
  alerts_screen_title: string;
  alerts_live_connected: string;
  alerts_offline_cached: string;
  alerts_filter_all: string;
  alerts_filter_official: string;
  alerts_filter_weather: string;
  alerts_filter_advisory: string;
  alerts_filter_news: string;
  alerts_empty_title: string;
  alerts_empty_subtitle: string;
  alerts_empty_refresh_btn: string;

  // General Actions
  btn_close: string;
  btn_cancel: string;
  btn_confirm: string;
  btn_refresh: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    tab_home: 'Home',
    tab_map: 'Map',
    tab_alerts: 'Alerts',
    tab_profile: 'Profile',

    app_name: 'MatsyaMitra',
    app_subtitle: 'Your Fishing Companion',
    greeting_morning: 'Good Morning',
    greeting_afternoon: 'Good Afternoon',
    greeting_evening: 'Good Evening',
    user_full_name: 'Ramesh Kumar!',
    banner_slogan_kn: 'ಸುರಕ್ಷಿತ ಸಮುದ್ರ,\nಹೆಚ್ಚು ಮೀನು, ಉತ್ತಮ ಜೀವನ',
    banner_slogan_en: 'Safer Seas • Better Catch • Stronger Tomorrow',
    current_conditions: 'Current Conditions',
    safe_to_fish: 'Safe to Fish',
    caution_to_fish: 'Caution Needed',
    unsafe_to_fish: 'Do Not Venture',
    view_all: 'View All',
    badge_pro: 'Pro',
    live_connected: 'LIVE TELEMETRY CONNECTED',
    offline_cached: 'OFFLINE / LIVE DATA UNAVAILABLE',
    connecting: 'Connecting to MatsyaMitra API server...',

    wind_speed: 'WIND SPEED',
    wave_height: 'WAVE HEIGHT',
    humidity: 'HUMIDITY',
    sea_temp: 'SEA TEMP',
    chlorophyll: 'CHLOROPHYLL',
    updated_ago: 'UPDATED RECENTLY',
    km_per_hour: 'km/h',
    meters: 'm',

    cond_clear_calm: 'CLEAR & CALM',
    cond_moderate: 'MODERATE',
    cond_rough_sea: 'ROUGH SEA',
    cond_high_wind: 'HIGH WIND',
    cond_favorable: 'FAVORABLE FOR FISHING',
    cond_caution: 'PROCEED WITH CAUTION',
    cond_dangerous: 'DANGER - DO NOT SAIL',

    advisory_title: "Today's Fishing Advisory",
    advisory_official: 'INCOIS Coastal Bulletin',
    advisory_view_map: 'View on Map',
    advisory_none_active: 'No active INCOIS advisories currently available. Live bulletins will appear when published.',
    advisory_safe_notice: 'Conditions are favorable for normal coastal fishing operations.',
    advisory_loading: 'Loading INCOIS advisories...',
    advisory_view_more: 'View More',
    advisory_show_less: 'Show Less',

    qa_fleet: 'Fleet Tracking',
    qa_catch: 'Catch Logs',
    qa_distress: 'Distress Alerts',
    qa_equipment: 'Equipment',

    cl_title: 'Catch Logs',
    cl_subtitle: '100% Offline Storage',
    cl_new_entry: 'New Entry',
    cl_history: 'History',
    cl_select_species: 'SELECT FISH SPECIES',
    cl_custom_species: 'Or type other species...',
    cl_weight_kg: 'WEIGHT (KG) *',
    cl_rate_per_kg: 'RATE (₹ / KG)',
    cl_notes: 'VOYAGE / NET NOTES',
    cl_btn_save: 'Save Catch Record',
    cl_total_weight: 'Total Catch',
    cl_total_revenue: 'Est. Earnings',
    cl_no_records: 'No catch records saved yet. Add your first catch log offline above.',
    cl_delete_confirm: 'Are you sure you want to remove this entry?',

    species_mackerel: 'Indian Mackerel (ಬಂಗುಡೆ)',
    species_sardine: 'Oil Sardine (ತಾರಲೆ)',
    species_kingfish: 'Kingfish / Seer (ಅಂಜಲ್)',
    species_pomfret: 'Silver Pomfret (ಮಾಂಜಿ)',
    species_tuna: 'Yellowfin Tuna (ಗೆದ್ದರ್)',
    species_prawn: 'White Prawn (ಸೀಗಡಿ)',
    species_squid: 'Squid / Cuttlefish (ಬೊಂಡಾಸ್)',

    sos_title: 'Emergency Distress',
    sos_subtitle: 'Maritime Safety & SOS Broadcast',
    sos_position_beacon: 'CURRENT POSITION BEACON',
    sos_latitude: 'LATITUDE',
    sos_longitude: 'LONGITUDE',
    sos_broadcast_btn: 'BROADCAST MAYDAY (SMS)',
    sos_broadcast_sub: 'Generates emergency SMS beacon with GPS coordinates to Coastal Police (1093)',
    sos_helpline_heading: 'DIRECT MARITIME HELPLINES',
    sos_coast_guard: 'Indian Coast Guard SAR',
    sos_coast_guard_sub: 'National Maritime Search & Rescue (Toll Free)',
    sos_coastal_police: 'Karnataka Coastal Police',
    sos_coastal_police_sub: 'Coastal Security Police Helpline (CSP)',
    sos_emergency_112: 'National Emergency Service',
    sos_emergency_112_sub: 'Police, Ambulance & Fire Integrated',
    sos_call_btn: 'Call',
    sos_2g_notice: 'SMS distress messages can transmit over basic 2G cellular towers even when mobile internet data fails at sea. Keep your phone elevated in open air for strongest signal.',

    eq_title: 'Equipment Checklist',
    eq_subtitle: 'Pre-departure Inspection',
    eq_readiness_title: 'VOYAGE READINESS',
    eq_ready_to_sail: 'READY TO SAIL',
    eq_attention_required: 'ATTENTION REQUIRED',
    eq_safety_count: 'safety checks completed',
    eq_reset_btn: 'Reset',
    eq_item_life_jackets: 'Life Jackets (ISI/SOLAS)',
    eq_item_life_jackets_desc: '1 certified jacket per crew member on board',
    eq_item_vhf: 'VHF Marine Radio',
    eq_item_vhf_desc: 'Tuned and tested on Channel 16 (156.8 MHz)',
    eq_item_gps: 'GPS / Navigation Device',
    eq_item_gps_desc: 'Loaded with coastal waypoints and battery charged',
    eq_item_flares: 'Visual Distress Flares / Smoke',
    eq_item_flares_desc: 'Red handheld flares & orange smoke signals valid',
    eq_item_fuel_water: 'Reserve Fuel & Fresh Water',
    eq_item_fuel_water_desc: 'At least 25% reserve fuel + 5L drinking water/person',
    eq_item_first_aid: 'First Aid Medical Kit',
    eq_item_first_aid_desc: 'Bandages, antiseptic, burn cream, motion sickness tabs',
    eq_item_anchor: 'Secondary Anchor & Manual Bilge Pump',
    eq_item_anchor_desc: 'Emergency anchoring and bailing readiness',

    ft_title: 'Fleet Tracking',
    ft_subtitle: 'Karnataka Coastal Fleet Radar',
    ft_boats_reporting: 'BOATS REPORTING',
    ft_in_fishing_zones: 'IN FISHING ZONES',
    ft_ports_covered: 'Across 6 major ports',
    ft_zone_distance: 'Within 12–25 NM',
    ft_crowd_notice: 'MatsyaMitra dynamically redistributes zone recommendations away from high-density harbors to prevent overfishing and gear tangles.',
    ft_harbor_status_title: 'REGIONAL HARBOR VESSEL STATUS',
    ft_vessels_registered: 'registered vessels',
    ft_vessels_offshore: 'offshore',
    density_low: 'Low Density',
    density_moderate: 'Moderate Density',
    density_high: 'High Density',

    loc_select_title: 'Select Coastal Location',
    loc_search_placeholder: 'Search port or harbor...',
    loc_active_badge: 'ACTIVE',

    alerts_screen_title: 'Alerts & Notices',
    alerts_live_connected: 'LIVE FEED CONNECTED',
    alerts_offline_cached: 'OFFLINE / CACHED NOTICES',
    alerts_filter_all: 'All',
    alerts_filter_official: 'Official',
    alerts_filter_weather: 'Weather',
    alerts_filter_advisory: 'Advisory',
    alerts_filter_news: 'News',
    alerts_empty_title: 'No new alerts today',
    alerts_empty_subtitle: "The sea is calm. We'll notify you if any official advisories are issued.",
    alerts_empty_refresh_btn: 'CHECK FOR UPDATES',

    btn_close: 'Close',
    btn_cancel: 'Cancel',
    btn_confirm: 'Confirm',
    btn_refresh: 'Refresh',
  },

  kn: {
    tab_home: 'ಮುಖಪುಟ',
    tab_map: 'ನಕ್ಷೆ',
    tab_alerts: 'ಎಚ್ಚರಿಕೆಗಳು',
    tab_profile: 'ಪ್ರೊಫೈಲ್',

    app_name: 'ಮತ್ಸ್ಯಮಿತ್ರ',
    app_subtitle: 'ನಿಮ್ಮ ಮೀನುಗಾರಿಕೆಯ ಸಂಗಾತಿ',
    greeting_morning: 'ಶುಭೋದಯ',
    greeting_afternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
    greeting_evening: 'ಶುಭ ಸಂಜೆ',
    user_full_name: 'ರಮೇಶ್ ಕುಮಾರ್!',
    banner_slogan_kn: 'ಸುರಕ್ಷಿತ ಸಮುದ್ರ,\nಹೆಚ್ಚು ಮೀನು, ಉತ್ತಮ ಜೀವನ',
    banner_slogan_en: 'ಸುರಕ್ಷಿತ ಸಮುದ್ರ • ಹೆಚ್ಚು ಮೀನು • ಬಲಿಷ್ಠ ಭವಿಷ್ಯ',
    current_conditions: 'ಪ್ರಸ್ತುತ ವಾತಾವರಣ',
    safe_to_fish: 'ಮೀನುಗಾರಿಕೆಗೆ ಸುರಕ್ಷಿತ',
    caution_to_fish: 'ಎಚ್ಚರಿಕೆ ವಹಿಸಿ',
    unsafe_to_fish: 'ಸಮುದ್ರಕ್ಕೆ ಇಳಿಯಬೇಡಿ',
    view_all: 'ಎಲ್ಲವನ್ನೂ ನೋಡಿ',
    badge_pro: 'ಪ್ರೊ',
    live_connected: 'ಲೈವ್ ಸಂಪರ್ಕದಲ್ಲಿದೆ',
    offline_cached: 'ನೆಟ್‌ವರ್ಕ್ ಇಲ್ಲ / ಹಳೆಯ ಮಾಹಿತಿ',
    connecting: 'ಮತ್ಸ್ಯಮಿತ್ರ ಸರ್ವರ್‌ಗೆ ಸಂಪರ್ಕಿಸಲಾಗುತ್ತಿದೆ...',

    wind_speed: 'ಗಾಳಿಯ ವೇಗ',
    wave_height: 'ಅಲೆಯ ಎತ್ತರ',
    humidity: 'ತೇವಾಂಶ',
    sea_temp: 'ನೀರಿನ ಬಿಸಿ',
    chlorophyll: 'ಕ್ಲೋರೋಫಿಲ್',
    updated_ago: 'ಇತ್ತೀಚಿನ ಮಾಹಿತಿ',
    km_per_hour: 'ಕಿ.ಮೀ/ಗಂ',
    meters: 'ಮೀಟರ್',

    cond_clear_calm: 'ತಿಳಿ & ಶಾಂತ ವಾತಾವರಣ',
    cond_moderate: 'ಸಾಧಾರಣ ವಾತಾವರಣ',
    cond_rough_sea: 'ಸಮುದ್ರ ಪ್ರಕ್ಷುಬ್ಧ (ಅಪಾಯ)',
    cond_high_wind: 'ಜೋರು ಬಿರುಗಾಳಿ',
    cond_favorable: 'ಮೀನುಗಾರಿಕೆಗೆ ಸರಿ ಇದೆ',
    cond_caution: 'ಎಚ್ಚರಿಕೆಯಿಂದ ಹೋಗಿ',
    cond_dangerous: 'ಅಪಾಯ - ಸಮುದ್ರಕ್ಕೆ ಹೋಗಬೇಡಿ',

    advisory_title: 'ಇಂದಿನ ಮೀನುಗಾರಿಕೆ ಸಲಹೆ',
    advisory_official: 'ಇನ್ಕೋಯಿಸ್ (INCOIS) ಅಧಿಕೃತ ಮಾಹಿತಿ',
    advisory_view_map: 'ನಕ್ಷೆಯಲ್ಲಿ ನೋಡಿ',
    advisory_none_active: 'ಯಾವುದೇ ಹೊಸ ಅಪಾಯದ ಎಚ್ಚರಿಕೆ ಇಲ್ಲ. ಸಮುದ್ರ ಶಾಂತವಾಗಿದೆ, ಕರಾವಳಿ ಮೀನುಗಾರಿಕೆಗೆ ಹೋಗಬಹುದು.',
    advisory_safe_notice: 'ಸಾಮಾನ್ಯ ಮೀನುಗಾರಿಕೆಗೆ ಪರಿಸ್ಥಿತಿ ಅನುಕೂಲಕರವಾಗಿದೆ.',
    advisory_loading: 'ಮಾಹಿತಿ ಪಡೆಯಲಾಗುತ್ತಿದೆ...',
    advisory_view_more: 'ಇನ್ನಷ್ಟು ಸಲಹೆಗಳು',
    advisory_show_less: 'ಕಡಿಮೆ ಮಾಡಿ',

    qa_fleet: 'ದೋಣಿಗಳ ಮಾಹಿತಿ',
    qa_catch: 'ಮೀನಿನ ಲೆಕ್ಕ',
    qa_distress: 'ತುರ್ತು ಸಹಾಯ (SOS)',
    qa_equipment: 'ಸಾಮಗ್ರಿ ತಪಾಸಣೆ',

    cl_title: 'ಮೀನಿನ ಲೆಕ್ಕ',
    cl_subtitle: '100% ಆಫ್‌ಲೈನ್ ದಾಖಲೆ',
    cl_new_entry: 'ಹೊಸ ಲೆಕ್ಕ',
    cl_history: 'ಹಿಂದಿನ ಲೆಕ್ಕ',
    cl_select_species: 'ಮೀನಿನ ಜಾತಿ ಆಯ್ಕೆಮಾಡಿ',
    cl_custom_species: 'ಬೇರೆ ಮೀನಿನ ಹೆಸರು ಟೈಪ್ ಮಾಡಿ...',
    cl_weight_kg: 'ತೂಕ (ಕೆ.ಜಿ) *',
    cl_rate_per_kg: 'ದರ (₹ / ಕೆ.ಜಿ)',
    cl_notes: 'ದೋಣಿ / ಬಲೆ / ಜಾಗದ ಟಿಪ್ಪಣಿ',
    cl_btn_save: 'ಲೆಕ್ಕ ಸೇರಿಸಿ',
    cl_total_weight: 'ಒಟ್ಟು ಮೀನು',
    cl_total_revenue: 'ಅಂದಾಜು ಗಳಿಕೆ',
    cl_no_records: 'ಇನ್ನೂ ಯಾವುದೇ ಮೀನಿನ ಲೆಕ್ಕ ದಾಖಲಾಗಿಲ್ಲ. ಮೇಲೆ ಹೊಸ ಲೆಕ್ಕ ಸೇರಿಸಿ.',
    cl_delete_confirm: 'ಈ ದಾಖಲೆಯನ್ನು ಅಳಿಸಲು ಖಚಿತವೇ?',

    species_mackerel: 'ಬಂಗುಡೆ (Mackerel)',
    species_sardine: 'ತಾರಲೆ / ಬೂತಾಯಿ (Sardine)',
    species_kingfish: 'ಅಂಜಲ್ / ಸುರಮಾಯಿ (Kingfish)',
    species_pomfret: 'ಮಾಂಜಿ / ಬೆಳ್ಳಿ ಮಾಂಜಿ (Pomfret)',
    species_tuna: 'ಗೆದ್ದರ್ / ತೂನ (Tuna)',
    species_prawn: 'ಸೀಗಡಿ (Prawn)',
    species_squid: 'ಬೊಂಡಾಸ್ / ಸಿಂಪ್ಟೆ (Squid)',

    sos_title: 'ತುರ್ತು ಅಪಾಯದ ಕರೆ (SOS)',
    sos_subtitle: 'ಸಮುದ್ರ ಭದ್ರತೆ & ತುರ್ತು ಸಂದೇಶ',
    sos_position_beacon: 'ನಿಮ್ಮ ಸದ್ಯದ ಜಾಗ (GPS)',
    sos_latitude: 'ಅಕ್ಷಾಂಶ (LAT)',
    sos_longitude: 'ರೇಖಾಂಶ (LON)',
    sos_broadcast_btn: 'ತುರ್ತು ಸಂದೇಶ ಕಳುಹಿಸಿ (SMS)',
    sos_broadcast_sub: 'ಕರಾವಳಿ ಪೊಲೀಸರಿಗೆ (1093) ನಿಮ್ಮ ಜಾಗದ ನಕ್ಷೆ ಮತ್ತು ತುರ್ತು ಸಂದೇಶ ತಕ್ಷಣ ಕಳುಹಿಸುತ್ತದೆ',
    sos_helpline_heading: 'ನೇರ ಸಹಾಯವಾಣಿ ಕರೆಗಳು',
    sos_coast_guard: 'ಕರಾವಳಿ ಕಾವಲು ಪಡೆ (ಕೋಸ್ಟ್ ಗಾರ್ಡ್)',
    sos_coast_guard_sub: 'ಸಮುದ್ರ ಶೋಧನೆ ಮತ್ತು ರಕ್ಷಣಾ ಪಡೆ (ಉಚಿತ ಕರೆ)',
    sos_coastal_police: 'ಕರ್ನಾಟಕ ಕರಾವಳಿ ಭದ್ರತಾ ಪೊಲೀಸ್',
    sos_coastal_police_sub: 'ಕರಾವಳಿ ಪೊಲೀಸ್ ಹೆಲ್ಪ್‌ಲೈನ್ (CSP)',
    sos_emergency_112: 'ರಾಷ್ಟ್ರೀಯ ತುರ್ತು ಸೇವೆ (112)',
    sos_emergency_112_sub: 'ಪೊಲೀಸ್, ಆಂಬ್ಯುಲೆನ್ಸ್ ಮತ್ತು ಅಗ್ನಿಶಾಮಕ',
    sos_call_btn: 'ಕರೆ ಮಾಡಿ',
    sos_2g_notice: 'ಸಮುದ್ರದಲ್ಲಿ ಇಂಟರ್ನೆಟ್ ಇಲ್ಲದಿದ್ದರೂ ಸಾಮಾನ್ಯ 2G ಮೊಬೈಲ್ ಟವರ್ ಸಿಗ್ನಲ್ ಮೂಲಕ SMS ತುರ್ತು ಸಂದೇಶ ರವಾನೆಯಾಗುತ್ತದೆ. ಉತ್ತಮ ಸಿಗ್ನಲ್‌ಗಾಗಿ ಫೋನ್‌ ಅನ್ನು ಎತ್ತರದಲ್ಲಿ ಹಿಡಿಯಿರಿ.',

    eq_title: 'ದೋಣಿ ಸಾಮಗ್ರಿ ತಪಾಸಣೆ',
    eq_subtitle: 'ಬಂದರು ಬಿಡುವ ಮುನ್ನ ತಪಾಸಣೆ',
    eq_readiness_title: 'ಪ್ರಯಾಣದ ಸಿದ್ಧತೆ',
    eq_ready_to_sail: 'ಹೊರಡಲು ಸಿದ್ಧವಾಗಿದೆ',
    eq_attention_required: 'ಗಮನಿಸಿ - ಸಾಮಗ್ರಿ ಕೊರತೆ ಇದೆ',
    eq_safety_count: 'ಸಾಮಗ್ರಿ ಸಿದ್ಧವಾಗಿದೆ',
    eq_reset_btn: 'ಮೊದಲಿನಿಂದ',
    eq_item_life_jackets: 'ಲೈಫ್ ಜಾಕೆಟ್‌ಗಳು (Life Jackets)',
    eq_item_life_jackets_desc: 'ದೋಣಿಯಲ್ಲಿರುವ ಪ್ರತಿಯೊಬ್ಬ ನಾವಿಕನಿಗೂ 1 ಜಾಕೆಟ್',
    eq_item_vhf: 'ವೈರ್‌ಲೆಸ್ ಮರೈನ್ ರೇಡಿಯೋ (VHF)',
    eq_item_vhf_desc: 'ಚಾನೆಲ್ 16 ರಲ್ಲಿ ಪರೀಕ್ಷಿಸಿ ಸರಿಯಾಗಿದೆ',
    eq_item_gps: 'ಜಿ.ಪಿ.ಎಸ್ / ಕಂಪಾಸ್ ಉಪಕರಣ',
    eq_item_gps_desc: 'ಬ್ಯಾಟರಿ ಫುಲ್ ಚಾರ್ಜ್ ಮತ್ತು ಬಂದರು ಗುರುತುಗಳೊಂದಿಗೆ',
    eq_item_flares: 'ಅಪಾಯದ ಸಿಗ್ನಲ್ ಫ್ಲೇರ್ಸ್ / ಹೊಗೆ',
    eq_item_flares_desc: 'ಕೆಂಪು ಫ್ಲೇರ್ ಮತ್ತು ಕಿತ್ತಳೆ ಹೊಗೆ ಸಂಕೇತ ಸರಿಯಾಗಿದೆ',
    eq_item_fuel_water: 'ಹೆಚ್ಚುವರಿ ಡೀಸೆಲ್ & ಕುಡಿಯುವ ನೀರು',
    eq_item_fuel_water_desc: 'ಕನಿಷ್ಠ 25% ಹೆಚ್ಚುವರಿ ಡೀಸೆಲ್ + ಪ್ರತಿ ವ್ಯಕ್ತಿಗೆ 5L ನೀರು',
    eq_item_first_aid: 'ಪ್ರಥಮ ಚಿಕಿತ್ಸೆ ಕಿಟ್ (First Aid)',
    eq_item_first_aid_desc: 'ಬ್ಯಾಂಡೇಜ್, ಮದ್ದು, ಸುಟ್ಟ ಗಾಯದ ಮುಲಾಮು, ವಾಂತಿ ಮಾತ್ರೆ',
    eq_item_anchor: 'ಹೆಚ್ಚುವರಿ ಲಂಗರು & ಪಂಪ್',
    eq_item_anchor_desc: 'ತುರ್ತು ಸಮಯದಲ್ಲಿ ನೀರು ಹೊರಹಾಕುವ ಪಂಪ್ ಮತ್ತು ಲಂಗರು',

    ft_title: 'ದೋಣಿಗಳ ಮಾಹಿತಿ',
    ft_subtitle: 'ಕರ್ನಾಟಕ ಕರಾವಳಿ ದೋಣಿಗಳ ರಾಡಾರ್',
    ft_boats_reporting: 'ವರದಿ ಮಾಡಿದ ದೋಣಿಗಳು',
    ft_in_fishing_zones: 'ಮೀನುಗಾರಿಕೆ ವಲಯದಲ್ಲಿರುವ ದೋಣಿಗಳು',
    ft_ports_covered: '6 ಪ್ರಮುಖ ಬಂದರುಗಳಲ್ಲಿ',
    ft_zone_distance: '12–25 ನಾಟಿಕಲ್ ಮೈಲಿ ದೂರದಲ್ಲಿ',
    ft_crowd_notice: 'ಮೀನುಗಾರರ ಬಲೆ ಸಿಕ್ಕಿಹಾಕಿಕೊಳ್ಳುವುದನ್ನು ತಪ್ಪಿಸಲು ಮತ್ತು ಅತಿಯಾದ ಮೀನುಗಾರಿಕೆ ತಡೆಯಲು ಮತ್ಸ್ಯಮಿತ್ರ ದೋಣಿಗಳನ್ನು ಸಮವಾಗಿ ಹಂಚಿಕೆ ಮಾಡುತ್ತದೆ.',
    ft_harbor_status_title: 'ಬಂದರುಗಳಲ್ಲಿ ದೋಣಿಗಳ ಸ್ಥಿತಿ',
    ft_vessels_registered: 'ನೋಂದಾಯಿತ ದೋಣಿಗಳು',
    ft_vessels_offshore: 'ಸಮುದ್ರದಲ್ಲಿವೆ',
    density_low: 'ಕಡಿಮೆ ದಟ್ಟಣೆ',
    density_moderate: 'ಸಾಧಾರಣ ದಟ್ಟಣೆ',
    density_high: 'ಹೆಚ್ಚು ದಟ್ಟಣೆ',

    loc_select_title: 'ಕರಾವಳಿ ಬಂದರು ಆಯ್ಕೆಮಾಡಿ',
    loc_search_placeholder: 'ಬಂದರು ಹುಡುಕಿ...',
    loc_active_badge: 'ಸಕ್ರಿಯ',

    alerts_screen_title: 'ಎಚ್ಚರಿಕೆಗಳು & ಪ್ರಕಟಣೆಗಳು',
    alerts_live_connected: 'ಲೈವ್ ಸಂಪರ್ಕದಲ್ಲಿದೆ',
    alerts_offline_cached: 'ಆಫ್‌ಲೈನ್ / ಹಳೆಯ ಪ್ರಕಟಣೆಗಳು',
    alerts_filter_all: 'ಎಲ್ಲವೂ',
    alerts_filter_official: 'ಅಧಿಕೃತ',
    alerts_filter_weather: 'ಹವಾಮಾನ',
    alerts_filter_advisory: 'ಮೀನುಗಾರಿಕೆ ಮಾಹಿತಿ',
    alerts_filter_news: 'ಸುದ್ದಿ',
    alerts_empty_title: 'ಇಂದು ಯಾವುದೇ ಹೊಸ ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ',
    alerts_empty_subtitle: 'ಸಮುದ್ರ ಶಾಂತವಾಗಿದೆ. ಅಧಿಕೃತ ಮಾಹಿತಿ ಅಥವಾ ಹೊಸ ಎಚ್ಚರಿಕೆ ಬಂದರೆ ತಕ್ಷಣ ಇಲ್ಲಿ ತಿಳಿಸಲಾಗುವುದು.',
    alerts_empty_refresh_btn: 'ಹೊಸ ಮಾಹಿತಿ ಪರಿಶೀಲಿಸಿ',

    btn_close: 'ಮುಚ್ಚಿ',
    btn_cancel: 'ರದ್ದು',
    btn_confirm: 'ಖಚಿತಪಡಿಸಿ',
    btn_refresh: 'ತಾಜಾ ಮಾಡಿ',
  },
};

export type TranslationKey = keyof Translations;
