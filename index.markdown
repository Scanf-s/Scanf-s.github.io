---
layout: default
title: Home
---

# Welcome to {{ site.title }}

{{ site.description }}

## Recent Posts

{% for post in site.posts %}
- [{{ post.title }}]({{ post.url }}) - {{ post.date | date: "%Y-%m-%d" }}
{% endfor %}
