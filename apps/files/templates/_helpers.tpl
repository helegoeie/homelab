{{- define "files.labels" -}}
app.kubernetes.io/name: files
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
