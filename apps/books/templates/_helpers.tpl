{{- define "books.labels" -}}
app.kubernetes.io/name: book01
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
