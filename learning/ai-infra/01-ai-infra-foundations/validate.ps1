[CmdletBinding()]
param(
    [string]$Root = '',
    [switch]$RequireFormal,
    [string]$CanonicalMarkdown = ''
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($Root)) {
    $Root = Split-Path -Parent $MyInvocation.MyCommand.Path
}

$script:Failures = New-Object System.Collections.Generic.List[string]
$script:Checks = 0

function Assert-Check {
    param(
        [bool]$Condition,
        [string]$Message
    )
    $script:Checks++
    if (-not $Condition) {
        $script:Failures.Add($Message)
    }
}

function Read-Utf8 {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Resolve-ChildPath {
    param([string]$RelativePath)
    $normal = $RelativePath -replace '/', [System.IO.Path]::DirectorySeparatorChar
    return Join-Path $Root $normal
}

$required = @(
    'index.html',
    'cuda-docs.css',
    'cuda-docs.js',
    'content-manifest.json',
    'cuda-programming-guide-zh.md',
    'vendor-lock.json',
    'tests/cuda-docs.test.js',
    'tests/cuda-docs-stress.test.js'
)

foreach ($relative in $required) {
    Assert-Check (Test-Path -LiteralPath (Resolve-ChildPath $relative) -PathType Leaf) "缺少必需文件：$relative"
}

if ($script:Failures.Count -gt 0) {
    $script:Failures | ForEach-Object { Write-Error $_ }
    exit 1
}

$manifestPath = Resolve-ChildPath 'content-manifest.json'
$manifestText = Read-Utf8 $manifestPath
$manifest = $manifestText | ConvertFrom-Json
$sourceMarkdownSafe = [bool]($manifest.sourceMarkdown -match '^(?:\./)?[A-Za-z0-9._/-]+\.md$') -and $manifest.sourceMarkdown -notmatch '\.\.|\\'
Assert-Check $sourceMarkdownSafe 'Markdown 数据源必须是站点内的相对 .md 文件。'
if (-not $sourceMarkdownSafe) {
    Write-Error '拒绝读取不安全的 manifest.sourceMarkdown。'
    exit 1
}
$markdownPath = Resolve-ChildPath $manifest.sourceMarkdown
$markdown = Read-Utf8 $markdownPath
$index = Read-Utf8 (Resolve-ChildPath 'index.html')
$scriptText = Read-Utf8 (Resolve-ChildPath 'cuda-docs.js')
$styleText = Read-Utf8 (Resolve-ChildPath 'cuda-docs.css')

Assert-Check ($manifest.schemaVersion -eq 1) '内容清单 schemaVersion 必须为 1。'
Assert-Check ([bool]($manifest.release -match '^\d+\.\d+$')) 'Release 字段格式无效。'
Assert-Check ($manifest.chapters.Count -gt 0) '内容清单缺少顶层章节。'
Assert-Check ($manifest.pages.Count -gt 0) '内容清单缺少分页。'
Assert-Check (Test-Path -LiteralPath $markdownPath -PathType Leaf) '内容清单指向的 Markdown 不存在。'
Assert-Check ($manifest.sourceMarkdown -eq './cuda-programming-guide-zh.md') 'Markdown 数据源必须是固定发布文件 ./cuda-programming-guide-zh.md。'
Assert-Check ([bool]($manifest.officialUrl -match '^https://docs\.nvidia\.com/cuda/cuda-programming-guide(?:/|$)')) '官方原文链接必须位于 NVIDIA CUDA Programming Guide。'
Assert-Check ([bool]($manifest.noticesUrl -match '^https://docs\.nvidia\.com/cuda/cuda-programming-guide(?:/|$)')) 'NVIDIA Notices 链接无效。'

$routes = @{}
$anchors = @{}
foreach ($page in $manifest.pages) {
    $expectedRoute = '#page-' + ($page.chapter -replace '\.', '-')
    $expectedAnchor = '#section-' + ($page.chapter -replace '\.', '-')
    Assert-Check ($page.chapter -match '^\d+\.\d+$') "章节号无效：$($page.chapter)"
    Assert-Check ($page.route -eq $expectedRoute) "路由不符合语义约定：$($page.route)"
    Assert-Check ($page.titleAnchor -eq $expectedAnchor) "标题锚点不符合数字路径约定：$($page.titleAnchor)"
    Assert-Check (-not $routes.ContainsKey($page.route)) "分页路由重复：$($page.route)"
    Assert-Check (-not $anchors.ContainsKey($page.titleAnchor)) "标题锚点重复：$($page.titleAnchor)"
    Assert-Check (-not [string]::IsNullOrWhiteSpace($page.titleZh)) "分页缺少中文标题：$($page.chapter)"
    Assert-Check (-not [string]::IsNullOrWhiteSpace($page.titleEn)) "分页缺少英文标题：$($page.chapter)"
    Assert-Check ([bool]($page.officialSourceUrl -match '^https://docs\.nvidia\.com/cuda/cuda-programming-guide(?:/|$)')) "分页官方来源链接无效：$($page.chapter)"
    Assert-Check ($page.topLevelChapter -eq ($page.chapter -split '\.')[0]) "分页顶层章节映射错误：$($page.chapter)"
    $headingPattern = '(?m)^##\s+' + [regex]::Escape([string]$page.chapter) + '(?:\.)?\s+'
    Assert-Check ([regex]::IsMatch($markdown, $headingPattern)) "Markdown 缺少分页标题：$($page.chapter)"
    $routes[$page.route] = $true
    $anchors[$page.titleAnchor] = $true
}

if ($RequireFormal) {
    Assert-Check (-not [bool]$manifest.fixture) '要求正式验证，但内容清单仍标记为 fixture。'
    Assert-Check (-not [string]::IsNullOrWhiteSpace($CanonicalMarkdown)) '正式验证必须通过 -CanonicalMarkdown 提供根目录深入理解CUDA.md。'
}

$completenessText = ''
$glossaryText = ''
if (-not [bool]$manifest.fixture) {
    $completenessPath = Resolve-ChildPath 'completeness-report.json'
    $glossaryPath = Resolve-ChildPath 'glossary.md'
    Assert-Check (Test-Path -LiteralPath $completenessPath -PathType Leaf) '正式发布缺少 completeness-report.json。'
    Assert-Check (Test-Path -LiteralPath $glossaryPath -PathType Leaf) '正式发布缺少 glossary.md。'
    Assert-Check ($manifest.release -eq '13.3') '正式发布必须锁定 Release 13.3。'
    $fixedCounts = @{
        chapters = 6; pages = 46; numberedFigures = 57; unnumberedFigures = 10;
        totalFigures = 67; uniqueFigureAssets = 66; numberedTables = 62;
        unnumberedTables = 53; totalTables = 115
    }
    foreach ($name in $fixedCounts.Keys) {
        Assert-Check ([int]$manifest.expectedCounts.$name -eq $fixedCounts[$name]) "正式 expectedCounts.$name 必须为 $($fixedCounts[$name])。"
    }
    Assert-Check ($manifest.chapters.Count -eq $manifest.expectedCounts.chapters) '正式清单必须恰好包含 6 个顶层章节。'
    Assert-Check ($manifest.pages.Count -eq $manifest.expectedCounts.pages) '正式清单必须恰好包含 46 个分页。'
    Assert-Check ($manifest.figures.Count -eq $manifest.expectedCounts.totalFigures) '正式清单必须恰好包含 67 幅正文插图。'
    Assert-Check ($manifest.tables.Count -eq $manifest.expectedCounts.totalTables) '正式清单必须恰好包含 115 张表。'
    Assert-Check ($manifest.sourceErrata.Count -eq 11) '正式清单必须恰好包含 11 项已标注的 Release 13.3 原文勘误。'
    $expectedChapterNumbers = @('1','2','3','4','5','6')
    $actualChapterNumbers = @($manifest.chapters | ForEach-Object { [string]$_.number })
    Assert-Check (($actualChapterNumbers -join ',') -eq ($expectedChapterNumbers -join ',')) '顶层章节必须按 1–6 连续排列。'
    $expectedPages = @('1.1','1.2','1.3','2.1','2.2','2.3','2.4','2.5','2.6','2.7','3.1','3.2','3.3','3.4','3.5')
    $expectedPages += 1..20 | ForEach-Object { "4.$_" }
    $expectedPages += 1..8 | ForEach-Object { "5.$_" }
    $expectedPages += 1..3 | ForEach-Object { "6.$_" }
    $actualPages = @($manifest.pages | ForEach-Object { [string]$_.chapter })
    Assert-Check (($actualPages -join ',') -eq ($expectedPages -join ',')) '正式分页集合或顺序不是冻结的 46 页。'
    Assert-Check ([string]$manifest.pdf.sha256 -eq '1A0659B7324D10F1C0A57FC0C82AA83EE1ABA437FA85DABC90EE8F736E439BEA') '冻结 PDF SHA-256 不匹配。'
    Assert-Check ([int]$manifest.pdf.physicalPages -eq 698) '冻结 PDF 物理页数必须为 698。'
    Assert-Check ($manifest.pdf.published -eq $false) '内容清单必须明确 PDF 不发布。'
    $errataIds = @($manifest.sourceErrata | ForEach-Object { [string]$_.id })
    Assert-Check (@($errataIds | Sort-Object -Unique).Count -eq $errataIds.Count) '原文勘误 id 必须唯一。'
    foreach ($erratum in $manifest.sourceErrata) {
        Assert-Check ([bool]$erratum.id -and [bool]$erratum.page -and [bool]$erratum.section) '原文勘误缺少 id、page 或 section。'
        Assert-Check ([bool]$erratum.sourceOriginal -and [bool]$erratum.publishedCorrection -and [bool]$erratum.noteZh) '原文勘误缺少原文、更正或中文说明。'
        Assert-Check (@($manifest.pages | Where-Object { $_.chapter -eq [string]$erratum.page }).Count -eq 1) "原文勘误指向未知分页：$($erratum.id)"
    }
    $numberedFigures = @($manifest.figures | Where-Object { $_.number -is [int] -or $_.number -match '^\d+$' })
    $unnumberedFigures = @($manifest.figures | Where-Object { $_.number -eq $null -and $_.kind -ne 'fixture' })
    $numberedTables = @($manifest.tables | Where-Object { $_.number -is [int] -or $_.number -match '^\d+$' })
    $unnumberedTables = @($manifest.tables | Where-Object { $_.number -eq $null })
    Assert-Check ($numberedFigures.Count -eq $manifest.expectedCounts.numberedFigures) '正式清单必须包含 57 幅编号图。'
    Assert-Check ($unnumberedFigures.Count -eq $manifest.expectedCounts.unnumberedFigures) '正式清单必须包含 10 幅无编号图。'
    Assert-Check ($numberedTables.Count -eq $manifest.expectedCounts.numberedTables) '正式清单必须包含 62 个编号表。'
    Assert-Check ($unnumberedTables.Count -eq $manifest.expectedCounts.unnumberedTables) '正式清单必须包含 53 个无编号表。'
    $numbers = @($numberedFigures | ForEach-Object { [int]$_.number } | Sort-Object)
    $tableNumbers = @($numberedTables | ForEach-Object { [int]$_.number } | Sort-Object)
    $uniqueFigureFiles = @($manifest.figures | ForEach-Object { $_.file } | Sort-Object -Unique)
    $pageHeadings = [regex]::Matches($markdown, '(?m)^##\s+\d+\.\d+\.\s+')
    $markdownFigures = [regex]::Matches($markdown, '(?m)^!\[[^\]]+\]\(assets/figures/(?:figure|unnumbered)-\d{3}\.png\)\s*$')
    $markdownTables = [regex]::Matches($markdown, '(?m)^\s*(?:>\s*)?\|(?:\s*:?-{3,}:?\s*\|)+\s*$')
    Assert-Check (($numbers -join ',') -eq ((1..57) -join ',')) 'Figure 编号必须从 1 到 57 连续。'
    Assert-Check (($tableNumbers -join ',') -eq ((1..62) -join ',')) 'Table 编号必须从 1 到 62 连续。'
    Assert-Check ($uniqueFigureFiles.Count -eq $manifest.expectedCounts.uniqueFigureAssets) '正式清单必须引用 66 个唯一原图资源。'
    Assert-Check ($pageHeadings.Count -eq $manifest.expectedCounts.pages) '合并 Markdown 必须恰好包含 46 个分页标题。'
    Assert-Check ($markdownFigures.Count -eq $manifest.expectedCounts.totalFigures) '合并 Markdown 必须恰好包含 67 次正文插图引用。'
    Assert-Check ($markdownTables.Count -eq $manifest.expectedCounts.totalTables) '合并 Markdown 必须恰好包含 115 张语义表格。'
    Assert-Check (@($manifest.tables | Where-Object { -not [bool]$_.structureValidated }).Count -eq 0) '所有 115 张表都必须通过结构校验。'
    $publishedPdfs = @(Get-ChildItem -LiteralPath $Root -Recurse -File -Filter '*.pdf' -ErrorAction SilentlyContinue)
    Assert-Check ($publishedPdfs.Count -eq 0) '站点目录及其子目录不得包含 PDF。'
    Assert-Check ($markdown -notmatch '\{\{B\d{6}\}\}|UNRESOLVED') '正式 Markdown 含未解析翻译标记。'
    Assert-Check ($markdown -notmatch '<\s*(?:table|img)\b') '正式 Markdown 不得使用原始 HTML 表格或图片。'

    if ((Test-Path -LiteralPath $completenessPath -PathType Leaf) -and (Test-Path -LiteralPath $glossaryPath -PathType Leaf)) {
        $completenessText = Read-Utf8 $completenessPath
        $glossaryText = Read-Utf8 $glossaryPath
        $completeness = $completenessText | ConvertFrom-Json
        Assert-Check ($completeness.schemaVersion -eq 1) '完整性报告 schemaVersion 必须为 1。'
        Assert-Check ($completeness.deterministic -eq $true) '完整性报告必须标记为确定性构建。'
        Assert-Check ([bool]$completeness.allPass) '完整性报告未通过。'
        Assert-Check ($completeness.release -eq $manifest.release) '完整性报告 Release 与清单不一致。'
        Assert-Check (@($completeness.checks).Count -gt 0) '完整性报告缺少 checks。'
        Assert-Check (@($completeness.checks | Where-Object { -not [bool]$_.passed }).Count -eq 0) '完整性报告含未通过检查。'
        $markdownHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $markdownPath).Hash.ToLowerInvariant()
        $manifestHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $manifestPath).Hash.ToLowerInvariant()
        $glossaryHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $glossaryPath).Hash.ToLowerInvariant()
        Assert-Check ($markdownHash -eq ([string]$completeness.artifacts.'cuda-programming-guide-zh.md'.sha256).ToLowerInvariant()) '正文哈希与完整性报告不一致。'
        Assert-Check ($manifestHash -eq ([string]$completeness.artifacts.'content-manifest.json'.sha256).ToLowerInvariant()) '内容清单哈希与完整性报告不一致。'
        Assert-Check ($glossaryHash -eq ([string]$completeness.artifacts.'glossary.md'.sha256).ToLowerInvariant()) '术语表哈希与完整性报告不一致。'
        Assert-Check ((Get-Item -LiteralPath $markdownPath).Length -eq [long]$completeness.artifacts.'cuda-programming-guide-zh.md'.bytes) '正文长度与完整性报告不一致。'
        Assert-Check ((Get-Item -LiteralPath $manifestPath).Length -eq [long]$completeness.artifacts.'content-manifest.json'.bytes) '内容清单长度与完整性报告不一致。'
        Assert-Check ((Get-Item -LiteralPath $glossaryPath).Length -eq [long]$completeness.artifacts.'glossary.md'.bytes) '术语表长度与完整性报告不一致。'
    }

    if (-not [string]::IsNullOrWhiteSpace($CanonicalMarkdown)) {
        Assert-Check (Test-Path -LiteralPath $CanonicalMarkdown -PathType Leaf) 'CanonicalMarkdown 文件不存在。'
        if (Test-Path -LiteralPath $CanonicalMarkdown -PathType Leaf) {
            $canonicalHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $CanonicalMarkdown).Hash.ToLowerInvariant()
            $siteMarkdownHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $markdownPath).Hash.ToLowerInvariant()
            Assert-Check ($canonicalHash -eq $siteMarkdownHash) '根目录深入理解CUDA.md 与站点正文不是字节一致。'
        }
    }
}

foreach ($figure in $manifest.figures) {
    $figurePath = Resolve-ChildPath $figure.file
    Assert-Check ($figure.file -match '^assets/figures/(figure|unnumbered)-\d{3}\.png$') "原文插图文件名不稳定：$($figure.file)"
    Assert-Check (Test-Path -LiteralPath $figurePath -PathType Leaf) "插图文件不存在：$($figure.file)"
    Assert-Check (-not [string]::IsNullOrWhiteSpace($figure.altZh)) "插图缺少中文 alt：$($figure.file)"
    Assert-Check (-not [string]::IsNullOrWhiteSpace($figure.captionZh)) "插图缺少中文图题：$($figure.file)"
    if ((Test-Path -LiteralPath $figurePath -PathType Leaf) -and -not [bool]$manifest.fixture) {
        $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $figurePath).Hash.ToLowerInvariant()
        Assert-Check ($hash -eq ([string]$figure.sha256).ToLowerInvariant()) "插图哈希不匹配：$($figure.file)"
    }
}

$combined = $index + "`n" + $scriptText + "`n" + $styleText + "`n" + $manifestText + "`n" + $markdown + "`n" + $completenessText + "`n" + $glossaryText
$forbidden = @(
    @{ Pattern = '(?i)(?:\]\(|url\(\s*[\"]?|(?:src|href)\s*=\s*\"|\"(?:file|sourceMarkdown)\"\s*:\s*\")[a-z]:\\'; Message = '资源引用中检测到 Windows 绝对路径。' },
    @{ Pattern = '(?i)file://'; Message = '检测到 file:// 路径。' },
    @{ Pattern = '(?i)aiinfra\.pub'; Message = '检测到 aiinfra.pub 热链。' },
    @{ Pattern = '(?i)(?:feishu|larksuite)'; Message = '检测到飞书临时资源链接。' },
    @{ Pattern = '(?i)!\[[^\]]*\]\((?:https?:)?//'; Message = 'Markdown 中检测到外部图片热链。' },
    @{ Pattern = '!\[\]\('; Message = 'Markdown 中检测到空 alt。' }
)
foreach ($rule in $forbidden) {
    Assert-Check (-not [regex]::IsMatch($combined, $rule.Pattern)) $rule.Message
}

Assert-Check ($index -match '<meta\s+name="viewport"') 'HTML 缺少 viewport。'
Assert-Check ($index -match 'lang="zh-CN"') 'HTML 缺少 zh-CN 语言标记。'
Assert-Check ($index -notmatch 'https://cdnjs\.|https://cdn\.jsdelivr|https://unpkg') '运行时依赖必须本地化，不能引用 CDN。'
Assert-Check ($scriptText -match 'html:\s*false') 'Markdown 渲染器必须禁用原始 HTML。'
Assert-Check ($scriptText -match 'loading="lazy"') '图片渲染器必须注入 loading=lazy。'
Assert-Check ($scriptText -match 'decoding="async"') '图片渲染器必须注入 decoding=async。'
Assert-Check ($scriptText -match 'target="_blank"') '图片渲染器必须提供原图查看链接。'
Assert-Check ($scriptText -match 'githubAlertsPlugin') '缺少 GitHub Alerts 渲染支持。'
Assert-Check ($scriptText -match 'markdownitFootnote') '缺少脚注插件接线。'
Assert-Check ($scriptText -match 'mathPlugin') '缺少 KaTeX 数学公式接线。'
Assert-Check ($styleText -match '@media\s+\(max-width:\s*900px\)') '缺少移动端目录断点。'
Assert-Check ($styleText -match 'grid-template-columns:\s*minmax\(220px') '缺少三栏文档布局。'

$vendorLockPath = Resolve-ChildPath 'vendor-lock.json'
$vendorLock = (Read-Utf8 $vendorLockPath) | ConvertFrom-Json
foreach ($file in $vendorLock.files) {
    $path = Resolve-ChildPath $file.path
    Assert-Check (Test-Path -LiteralPath $path -PathType Leaf) "缺少 vendored 依赖：$($file.path)"
    if (Test-Path -LiteralPath $path -PathType Leaf) {
        $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash.ToLowerInvariant()
        Assert-Check ($actual -eq ([string]$file.sha256).ToLowerInvariant()) "vendored 依赖哈希不匹配：$($file.path)"
    }
}

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    & $node.Source --check (Resolve-ChildPath 'cuda-docs.js')
    Assert-Check ($LASTEXITCODE -eq 0) 'cuda-docs.js 未通过 node --check。'
    & $node.Source (Resolve-ChildPath 'tests/cuda-docs.test.js')
    Assert-Check ($LASTEXITCODE -eq 0) 'renderer contract tests 失败。'
    & $node.Source (Resolve-ChildPath 'tests/cuda-docs-stress.test.js')
    Assert-Check ($LASTEXITCODE -eq 0) 'large-content stress tests 失败。'
} else {
    Write-Warning '未找到 Node.js；已跳过 JavaScript 语法、renderer contract tests 与 stress tests。'
}

if ($script:Failures.Count -gt 0) {
    Write-Host "CUDA docs validation failed: $($script:Failures.Count) issue(s), $script:Checks checks." -ForegroundColor Red
    $script:Failures | ForEach-Object { Write-Host " - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "CUDA docs validation passed: $script:Checks checks; fixture=$([bool]$manifest.fixture); pages=$($manifest.pages.Count); figures=$($manifest.figures.Count); tables=$($manifest.tables.Count)." -ForegroundColor Green
