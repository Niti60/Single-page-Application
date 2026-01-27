/**
 * Parse User-Agent string to extract browser, OS, device info
 * Simple parser without external dependencies
 */

/**
 * Parse User-Agent to extract device information
 */
const parseUserAgent = (userAgent) => {
  if (!userAgent || typeof userAgent !== 'string') {
    return {
      browser: '',
      os: '',
      device: '',
      deviceVendor: '',
      deviceType: ''
    };
  }

  const ua = userAgent.toLowerCase();
  let browser = '';
  let os = '';
  let device = '';
  let deviceVendor = '';
  let deviceType = '';

  // Detect Browser
  if (ua.includes('chrome') && !ua.includes('edg')) {
    browser = 'Chrome';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  } else if (ua.includes('msie') || ua.includes('trident')) {
    browser = 'Internet Explorer';
  } else {
    browser = 'Unknown';
  }

  // Detect OS
  if (ua.includes('windows')) {
    if (ua.includes('windows nt 10')) {
      os = 'Windows 10';
    } else if (ua.includes('windows nt 6.3')) {
      os = 'Windows 8.1';
    } else if (ua.includes('windows nt 6.2')) {
      os = 'Windows 8';
    } else if (ua.includes('windows nt 6.1')) {
      os = 'Windows 7';
    } else {
      os = 'Windows';
    }
  } else if (ua.includes('mac os x') || ua.includes('macintosh')) {
    const match = ua.match(/mac os x (\d+)[._](\d+)/);
    if (match) {
      os = `macOS ${match[1]}.${match[2]}`;
    } else {
      os = 'macOS';
    }
  } else if (ua.includes('android')) {
    const match = ua.match(/android ([\d.]+)/);
    if (match) {
      os = `Android ${match[1]}`;
    } else {
      os = 'Android';
    }
  } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
    const match = ua.match(/os ([\d_]+)/);
    if (match) {
      const version = match[1].replace(/_/g, '.');
      os = `iOS ${version}`;
    } else {
      os = 'iOS';
    }
  } else if (ua.includes('linux')) {
    os = 'Linux';
  } else if (ua.includes('ubuntu')) {
    os = 'Ubuntu';
  } else {
    os = 'Unknown';
  }

  // Detect Device
  if (ua.includes('iphone')) {
    device = 'iPhone';
    deviceVendor = 'Apple';
    deviceType = '1'; // Mobile
  } else if (ua.includes('ipad')) {
    device = 'iPad';
    deviceVendor = 'Apple';
    deviceType = '2'; // Tablet
  } else if (ua.includes('android')) {
    // Try to extract device model from Android user agent
    const androidMatch = ua.match(/android.*?; (.*?)(?:\)|;|$)/);
    if (androidMatch) {
      device = androidMatch[1].trim();
      // Extract vendor if present
      if (device.includes('samsung')) {
        deviceVendor = 'Samsung';
      } else if (device.includes('lg')) {
        deviceVendor = 'LG';
      } else if (device.includes('huawei')) {
        deviceVendor = 'Huawei';
      } else if (device.includes('xiaomi')) {
        deviceVendor = 'Xiaomi';
      } else if (device.includes('oneplus')) {
        deviceVendor = 'OnePlus';
      } else {
        deviceVendor = 'Unknown';
      }
    } else {
      device = 'Android Device';
      deviceVendor = 'Unknown';
    }
    deviceType = '1'; // Mobile
  } else if (ua.includes('macintosh') || ua.includes('mac os')) {
    device = 'Mac';
    deviceVendor = 'Apple';
    deviceType = '3'; // Desktop
  } else if (ua.includes('windows')) {
    device = 'PC';
    deviceVendor = 'Microsoft';
    deviceType = '3'; // Desktop
  } else if (ua.includes('linux')) {
    device = 'Linux Device';
    deviceVendor = 'Unknown';
    deviceType = '3'; // Desktop
  } else {
    device = 'Unknown Device';
    deviceVendor = 'Unknown';
    deviceType = '3'; // Default to Desktop
  }

  return {
    browser,
    os,
    device,
    deviceVendor,
    deviceType
  };
};

module.exports = { parseUserAgent };
