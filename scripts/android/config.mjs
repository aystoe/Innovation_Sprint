export function validateAndroidConfig(config,identity){
 if(config.webDir!=='dist'||config.server?.url||config.server?.allowNavigation?.length||config.server?.cleartext)throw Error('Android must embed dist without a development server or navigation allowlist')
 if(config.appId!==identity.appId||config.appName!==identity.appName)throw Error('Capacitor and native identity must match')
 if(typeof identity.appName!=='string'||!identity.appName.trim()||identity.appName.length>80)throw Error('Invalid app display name')
 if(!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/.test(identity.appId))throw Error('Use a valid reverse-domain Android application ID')
 if(!Number.isSafeInteger(identity.versionCode)||identity.versionCode<1||identity.versionCode>2100000000)throw Error('Invalid Android versionCode')
 if(!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(identity.versionName))throw Error('Use a semantic versionName')
 if(config.android?.allowMixedContent!==false||config.android?.webContentsDebuggingEnabled!==false)throw Error('Release WebView must disable mixed content and debugging')
}
