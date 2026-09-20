{{- define "vid01.fullname" -}}
{{ .Release.Name }}
{{- end }}

{{- define "vid01.labels" -}}
app.kubernetes.io/name: vid01
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "vid01.selectorLabels" -}}
app.kubernetes.io/name: vid01
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
