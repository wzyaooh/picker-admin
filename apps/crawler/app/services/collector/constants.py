"""
常量定义：User-Agent 池、域名列表、语言-依赖映射、项目类型
"""

# 随机 User-Agent 池
USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
]

# 项目类型常量
PROJECT_TYPE_LIBRARY = 'library'
PROJECT_TYPE_APPLICATION = 'application'
PROJECT_TYPE_CLI = 'cli'
PROJECT_TYPE_DOCS = 'docs'
PROJECT_TYPE_DATA = 'data'
PROJECT_TYPE_OTHER = 'other'

# 项目类型 → 需要检查的依赖文件  (filename, parser_method_name | None)
LANG_DEP_FILES = {
    'JavaScript': [('package.json', 'parse_package_json')],
    'TypeScript': [('package.json', 'parse_package_json')],
    'Python': [
        ('requirements.txt', 'parse_requirements_txt'),
        ('pyproject.toml', 'parse_pyproject_toml'),
        ('setup.py', None),
        ('Pipfile', None),
    ],
    'Go': [('go.mod', 'parse_go_mod')],
    'Rust': [('Cargo.toml', 'parse_cargo_toml')],
    'Java': [('pom.xml', None), ('build.gradle', None)],
    'Kotlin': [('build.gradle.kts', None), ('pom.xml', None)],
    'Ruby': [('Gemfile', None)],
    'PHP': [('composer.json', 'parse_composer_json')],
    'C#': [('*.csproj', None), ('*.sln', None)],
    'Swift': [('Package.swift', None)],
    'Dart': [('pubspec.yaml', None)],
}

# 高质量技术域名（搜索评分加权）
QUALITY_DOMAINS = (
    'medium.com', 'dev.to', 'hashnode.com', 'freecodecamp.org',
    'towardsdatascience.com', 'hackernoon.com', 'infoq.com',
    'blog.logrocket.com', 'smashingmagazine.com', 'css-tricks.com',
    'stackoverflow.com', 'reddit.com', 'news.ycombinator.com',
    'juejin.cn', 'segmentfault.com', 'cnblogs.com', 'csdn.net',
    'zhihu.com', 'oschina.net', 'infoq.cn',
    'thenewstack.io', 'dzone.com', 'baeldung.com',
    'realpython.com', 'testdriven.io', 'digitalocean.com',
)

# 搜索时跳过的域名
SKIP_DOMAINS = (
    'github.com', 'github.io', 'npmjs.com', 'pypi.org',
    'crates.io', 'pkg.go.dev', 'rubygems.org', 'packagist.org',
    'hub.docker.com', 'twitter.com', 'x.com', 'facebook.com',
    'linkedin.com', 'youtube.com',
)

GITHUB_API = 'https://api.github.com'
