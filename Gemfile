source "https://rubygems.org"

# Use Jekyll 4.x for Chirpy theme compatibility
gem "jekyll", "~> 4.3"

# Chirpy theme as gem
gem "jekyll-theme-chirpy", "~> 7.2"

# Jekyll plugins required by Chirpy theme
group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-paginate"
  gem "jekyll-redirect-from"
  gem "jekyll-seo-tag"
  gem "jekyll-sitemap"
  gem "jekyll-include-cache"
  gem "jekyll-archives"
end

# Windows and JRuby does not include zoneinfo files
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock `http_parser.rb` gem to `v0.6.x` on JRuby builds
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

# webrick is required for Jekyll 4.x
gem "webrick", "~> 1.8"
