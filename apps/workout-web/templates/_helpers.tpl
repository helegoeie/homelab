{{- define "workout-web.fullname" -}}
{{ .Release.Name }}
{{- end }}

{{- define "workout-web.labels" -}}
app.kubernetes.io/name: workout-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "workout-web.selectorLabels" -}}
app.kubernetes.io/name: workout-web
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
