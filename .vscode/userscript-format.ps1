$template = Get-Content "./.vscode/userscript-template.txt";

$json = Get-Content "./package.json" | Out-String | ConvertFrom-Json;
$template = $template.  Replace("%NAME%", $json.displayName).
                        Replace("%NAMESPACE%", $json.namespace).
                        Replace("%VERSION%", $json.version).
                        Replace("%DESCRIPTION%", $json.description).
                        Replace("%AUTHOR%", $json.author);

Set-Content -Path "./build/script.user.js" -Value (($template) + (Get-Content "./build/script.user.js"));
