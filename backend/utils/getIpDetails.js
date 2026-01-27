/**
 * Fetch IP location and network details from external API
 * Uses ipapi.co (free tier) or ipinfo.io as fallback
 */
const https = require('https');
const http = require('http');

/**
 * Get IP details from ipapi.co
 */
const getIpDetailsFromIpapi = async (ip) => {
  return new Promise((resolve, reject) => {
    const url = `https://ipapi.co/${ip}/json/`;
    
    https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          // Check for error response
          if (json.error) {
            reject(new Error(json.reason || 'IP API error'));
            return;
          }
          
          resolve({
            city: json.city || '',
            region: json.region || '',
            country: json.country_name || '',
            continent: json.continent_code || '',
            region_code: json.region_code || '',
            country_code: json.country_code || '',
            continent_code: json.continent_code || '',
            latitude: json.latitude ? String(json.latitude) : '',
            longitude: json.longitude ? String(json.longitude) : '',
            time_zone: json.timezone || '',
            locale_code: json.languages || '',
            metro_code: '',
            is_in_european_union: json.in_eu || false,
            network: {
              network: json.org || '',
              autonomous_system_number: json.asn ? String(json.asn) : '',
              autonomous_system_organization: json.org || ''
            },
            security: {
              vpn: false, // ipapi.co doesn't provide this
              proxy: false,
              tor: false,
              relay: false
            },
            is_private: json.ip === '127.0.0.1' || json.ip?.startsWith('192.168.') || json.ip?.startsWith('10.')
          });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

/**
 * Get IP details from ipinfo.io (fallback)
 */
const getIpDetailsFromIpinfo = async (ip) => {
  return new Promise((resolve, reject) => {
    const url = `https://ipinfo.io/${ip}/json`;
    
    https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          if (json.error) {
            reject(new Error(json.error.message || 'IP Info error'));
            return;
          }
          
          // Parse location string (format: "lat,lng")
          const [lat, lng] = (json.loc || '').split(',');
          
          resolve({
            city: json.city || '',
            region: json.region || '',
            country: json.country || '',
            continent: '',
            region_code: json.region || '',
            country_code: json.country || '',
            continent_code: '',
            latitude: lat || '',
            longitude: lng || '',
            time_zone: json.timezone || '',
            locale_code: '',
            metro_code: '',
            is_in_european_union: false,
            network: {
              network: json.org || '',
              autonomous_system_number: '',
              autonomous_system_organization: json.org || ''
            },
            security: {
              vpn: false,
              proxy: false,
              tor: false,
              relay: false
            },
            is_private: json.ip === '127.0.0.1' || json.ip?.startsWith('192.168.') || json.ip?.startsWith('10.')
          });
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
};

/**
 * Get IP details with fallback
 */
const getIpDetails = async (ip) => {
  // Skip API call for localhost/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return {
      city: '',
      region: '',
      country: '',
      continent: '',
      region_code: '',
      country_code: '',
      continent_code: '',
      latitude: '',
      longitude: '',
      time_zone: '',
      locale_code: '',
      metro_code: '',
      is_in_european_union: false,
      network: {
        network: '',
        autonomous_system_number: '',
        autonomous_system_organization: ''
      },
      security: {
        vpn: false,
        proxy: false,
        tor: false,
        relay: false
      },
      is_private: true
    };
  }

  try {
    // Try ipapi.co first
    return await getIpDetailsFromIpapi(ip);
  } catch (error) {
    console.log(`[getIpDetails] ipapi.co failed, trying ipinfo.io: ${error.message}`);
    try {
      // Fallback to ipinfo.io
      return await getIpDetailsFromIpinfo(ip);
    } catch (fallbackError) {
      console.error(`[getIpDetails] Both APIs failed: ${fallbackError.message}`);
      // Return empty structure on failure
      return {
        city: '',
        region: '',
        country: '',
        continent: '',
        region_code: '',
        country_code: '',
        continent_code: '',
        latitude: '',
        longitude: '',
        time_zone: '',
        locale_code: '',
        metro_code: '',
        is_in_european_union: false,
        network: {
          network: '',
          autonomous_system_number: '',
          autonomous_system_organization: ''
        },
        security: {
          vpn: false,
          proxy: false,
          tor: false,
          relay: false
        },
        is_private: false
      };
    }
  }
};

module.exports = { getIpDetails };
