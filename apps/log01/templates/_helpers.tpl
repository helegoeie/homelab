{{- define "log01.fullname" -}}
{{ .Release.Name }}
{{- end }}

{{- define "log01.labels" -}}
app.kubernetes.io/name: log01
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{- define "log01.selectorLabels" -}}
app.kubernetes.io/name: log01
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
