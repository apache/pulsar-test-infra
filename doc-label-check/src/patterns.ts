// Unescape escaped characters when using these patterns in a YAML file
export const BACKTICK = '- \\[(.*?)\\] ?`(.+?)`'; // matches "- [ ] `abc` ..."
export const COLON = '- \\[(.*?)\\] ?(.+?):'; // matches "- [ ] abc: ..."
export const ASTERISK = '- \\[(.*?)\\] ?\\*(.+?)\\*'; // matches "- [ ] *abc* ..."
export const DOUBLE_ASTERISK = '- \\[(.*?)\\] ?\\*\\*(.+?)\\*\\*'; // matches "- [ ] **abc** ..."
