const { withStringsXml } = require('@expo/config-plugins');

module.exports = function withUcropStrings(config) {
  return withStringsXml(config, (config) => {
    const strings = config.modResults.resources.string || [];
    
    // Override the uCrop "CROP" string to "DONE"
    const existing = strings.findIndex((s) => s.$.name === 'ucrop_menu_crop');
    if (existing !== -1) {
      strings[existing]._ = 'DONE';
    } else {
      strings.push({
        $: { name: 'ucrop_menu_crop' },
        _: 'DONE',
      });
    }
    
    config.modResults.resources.string = strings;
    return config;
  });
};
