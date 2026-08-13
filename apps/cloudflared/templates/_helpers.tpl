{{- define "cloudflared.fullname" -}}
{{ .Release.Name }}
{{- end }}

{{- define "cloudflared.labels" -}}
app.kubernetes.io/name: cloudflared
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "cloudflared.selectorLabels" -}}
app.kubernetes.io/name: cloudflared
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
