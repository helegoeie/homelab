{{- define "albums.labels" -}}
app.kubernetes.io/name: alb01
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
