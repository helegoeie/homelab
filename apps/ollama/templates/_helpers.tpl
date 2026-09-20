{{- define "ollama.fullname" -}}
{{ .Release.Name }}
{{- end }}

{{- define "ollama.labels" -}}
app.kubernetes.io/name: ollama
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "ollama.selectorLabels" -}}
app.kubernetes.io/name: ollama
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
