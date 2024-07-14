여기 번역된 마크다운 버전입니다. 코드는 그대로 유지했습니다:

````markdown
# 2 The Good Thymes Virtual Grocery

이 가이드의 현재 및 향후 장에서 보여지는 예제의 소스 코드는 두 가지 (동등한) 버전의 _Good Thymes Virtual Grocery (GTVG)_ 예제 앱에서 찾을 수 있습니다:

- `javax.*` 기반: [gtvg-javax](https://github.com/thymeleaf/thymeleaf/tree/3.1-master/examples/core/thymeleaf-examples-gtvg-javax).
- `jakarta.*` 기반: [gtvg-jakarta](https://github.com/thymeleaf/thymeleaf/tree/3.1-master/examples/core/thymeleaf-examples-gtvg-jakarta).

## 2.1 식료품점을 위한 웹사이트

Thymeleaf로 템플릿을 처리하는 데 관련된 개념을 더 잘 설명하기 위해, 이 튜토리얼에서는 프로젝트 웹사이트에서 다운로드할 수 있는 데모 애플리케이션을 사용할 것입니다.

이 애플리케이션은 가상의 온라인 식료품점 웹사이트로, Thymeleaf의 다양한 기능을 보여주는 많은 시나리오를 제공할 것입니다.

시작하기 위해, 우리는 애플리케이션을 위한 간단한 모델 엔티티 세트가 필요합니다: `고객`에게 판매되는 `제품`들로 `주문`을 생성합니다. 또한 이러한 `제품`에 대한 `댓글`도 관리할 것입니다:

![예제 애플리케이션 모델](images/usingthymeleaf/gtvg-model.png)

우리의 애플리케이션은 또한 다음과 같은 메서드를 포함하는 `Service` 객체로 구성된 매우 간단한 서비스 계층을 가질 것입니다:

```java
public class ProductService {

    ...

    public List<Product> findAll() {
        return ProductRepository.getInstance().findAll();
    }

    public Product findById(Integer id) {
        return ProductRepository.getInstance().findById(id);
    }

}
```
````

웹 계층에서 우리의 애플리케이션은 요청 URL에 따라 Thymeleaf 지원 명령에 실행을 위임하는 필터를 가질 것입니다:

```java
/*
 * The application object needs to be declared first (implements IWebApplication)
 * In this case, the Jakarta-based version will be used.
 */
public void init(final FilterConfig filterConfig) throws ServletException {
    this.application =
            JakartaServletWebApplication.buildApplication(
                filterConfig.getServletContext());
    // We will see later how the TemplateEngine object is built and configured
    this.templateEngine = buildTemplateEngine(this.application);
}

/*
 * Each request will be processed by creating an exchange object (modeling
 * the request, its response and all the data needed for this process) and
 * then calling the corresponding controller.
 */
private boolean process(HttpServletRequest request, HttpServletResponse response)
        throws ServletException {

    try {

        final IWebExchange webExchange =
            this.application.buildExchange(request, response);
        final IWebRequest webRequest = webExchange.getRequest();

        // This prevents triggering engine executions for resource URLs
        if (request.getRequestURI().startsWith("/css") ||
                request.getRequestURI().startsWith("/images") ||
                request.getRequestURI().startsWith("/favicon")) {
            return false;
        }

        /*
         * Query controller/URL mapping and obtain the controller
         * that will process the request. If no controller is available,
         * return false and let other filters/servlets process the request.
         */
        final IGTVGController controller =
            ControllerMappings.resolveControllerForRequest(webRequest);
        if (controller == null) {
            return false;
        }

        /*
         * Write the response headers
         */
        response.setContentType("text/html;charset=UTF-8");
        response.setHeader("Pragma", "no-cache");
        response.setHeader("Cache-Control", "no-cache");
        response.setDateHeader("Expires", 0);

        /*
         * Obtain the response writer
         */
        final Writer writer = response.getWriter();

        /*
         * Execute the controller and process view template,
         * writing the results to the response writer.
         */
        controller.process(webExchange, this.templateEngine, writer);

        return true;

    } catch (Exception e) {
        try {
            response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        } catch (final IOException ignored) {
            // Just ignore this
        }
        throw new ServletException(e);
    }

}
```

이것이 우리의 `IGTVGController` 인터페이스입니다:

```java
public interface IGTVGController {

    public void process(
            final IWebExchange webExchange,
            final ITemplateEngine templateEngine,
            final Writer writer)
            throws Exception;

}
```

이제 우리가 해야 할 일은 `IGTVGController` 인터페이스의 구현을 만들고, 서비스에서 데이터를 검색하고 `ITemplateEngine` 객체를 사용하여 템플릿을 처리하는 것입니다.

결국, 다음과 같이 보일 것입니다:

![예제 애플리케이션 홈페이지](images/usingthymeleaf/gtvg-view.png)

하지만 먼저 템플릿 엔진이 어떻게 초기화되는지 살펴보겠습니다.

## 2.2 템플릿 엔진 생성 및 구성

우리 필터의 _init(...)_ 메서드에는 다음 줄이 포함되어 있었습니다:

```java
this.templateEngine = buildTemplateEngine(this.application);
```

이제 `org.thymeleaf.TemplateEngine` 객체가 어떻게 초기화되는지 살펴보겠습니다:

```java
private static ITemplateEngine buildTemplateEngine(final IWebApplication application) {

    // Templates will be resolved as application (ServletContext) resources
    final WebApplicationTemplateResolver templateResolver =
            new WebApplicationTemplateResolver(application);

    // HTML is the default mode, but we will set it anyway for better understanding of code
    templateResolver.setTemplateMode(TemplateMode.HTML);
    // This will convert "home" to "/WEB-INF/templates/home.html"
    templateResolver.setPrefix("/WEB-INF/templates/");
    templateResolver.setSuffix(".html");
    // Set template cache TTL to 1 hour. If not set, entries would live in cache until expelled by LRU
    templateResolver.setCacheTTLMs(Long.valueOf(3600000L));

    // Cache is set to true by default. Set to false if you want templates to
    // be automatically updated when modified.
    templateResolver.setCacheable(true);

    final TemplateEngine templateEngine = new TemplateEngine();
    templateEngine.setTemplateResolver(templateResolver);

    return templateEngine;

}
```

`TemplateEngine` 객체를 구성하는 방법은 많지만, 지금은 이 몇 줄의 코드로 필요한 단계에 대해 충분히 배울 수 있습니다.

### 템플릿 리졸버

템플릿 리졸버부터 시작해 봅시다:

```java
final WebApplicationTemplateResolver templateResolver =
        new WebApplicationTemplateResolver(application);
```

템플릿 리졸버는 Thymeleaf API의 `org.thymeleaf.templateresolver.ITemplateResolver` 인터페이스를 구현하는 객체입니다:

```java
public interface ITemplateResolver {

    ...

    /*
     * Templates are resolved by their name (or content) and also (optionally) their
     * owner template in case we are trying to resolve a fragment for another template.
     * Will return null if template cannot be handled by this template resolver.
     */
    public TemplateResolution resolveTemplate(
            final IEngineConfiguration configuration,
            final String ownerTemplate, final String template,
            final Map<String, Object> templateResolutionAttributes);
}
```

이 객체들은 템플릿에 어떻게 접근할 것인지를 결정하는 역할을 합니다. 이 GTVG 애플리케이션에서 `org.thymeleaf.templateresolver.WebApplicationTemplateResolver`의 사용은 우리가 템플릿 파일을 _IWebApplication_ 객체의 리소스로 검색할 것임을 의미합니다: 이는 Thymeleaf의 추상화로, 서블릿 기반 애플리케이션에서 기본적으로 서블릿 API의 `[javax|jakarta].servlet.ServletContext` 객체를 감싸고 웹 애플리케이션 루트에서 리소스를 해결합니다.

하지만 템플릿 리졸버에 대해 말할 수 있는 것은 이것만이 아닙니다. 우리는 여기에 몇 가지 구성 매개변수를 설정할 수 있습니다. 먼저, 템플릿 모드:

```java
templateResolver.setTemplateMode(TemplateMode.HTML);
```

HTML은 `WebApplicationTemplateResolver`의 기본 템플릿 모드이지만, 우리의 코드가 무슨 일이 일어나고 있는지 명확하게 문서화하도록 어쨌든 이를 설정하는 것이 좋습니다.

```java
templateResolver.setPrefix("/WEB-INF/templates/");
templateResolver.setSuffix(".html");
```

_prefix_ 와 _suffix_ 는 우리가 실제 리소스 이름을 얻기 위해 엔진에 전달할 템플릿 이름을 수정합니다.

이 구성을 사용하면 템플릿 이름 _"product/list"_ 는 다음에 해당합니다:

```java
servletContext.getResourceAsStream("/WEB-INF/templates/product/list.html")
```

선택적으로, 파싱된 템플릿이 캐시에 살아있을 수 있는 시간은 템플릿 리졸버의 _cacheTTLMs_ 속성으로 구성됩니다:

```java
templateResolver.setCacheTTLMs(3600000L);
```

템플릿은 여전히 TTL에 도달하기 전에 캐시에서 제거될 수 있습니다. 최대 캐시 크기에 도달하고 현재 캐시된 항목 중 가장 오래된 경우에 그렇습니다.

> 캐시 동작과 크기는 사용자가 `ICacheManager` 인터페이스를 구현하거나 기본 캐시를 관리하는 `StandardCacheManager` 객체를 수정하여 정의할 수 있습니다.

템플릿 리졸버에 대해 배울 것이 더 많지만, 지금은 템플릿 엔진 객체의 생성을 살펴보겠습니다.

### 템플릿 엔진

템플릿 엔진 객체는 `org.thymeleaf.ITemplateEngine` 인터페이스의 구현입니다. Thymeleaf 코어는 이러한 구현 중 하나를 제공합니다: `org.thymeleaf.TemplateEngine`, 우리는 여기서 그것의 인스턴스를 생성합니다:

```java
templateEngine = new TemplateEngine();
templateEngine.setTemplateResolver(templateResolver);
```

꽤 간단하지 않나요? 우리가 필요한 것은 인스턴스를 생성하고 템플릿 리졸버를 설정하는 것뿐입니다.

템플릿 리졸버는 `TemplateEngine`이 필요로 하는 유일한 _필수_ 매개변수이지만, 나중에 다룰 다른 많은 것들이 있습니다(메시지 리졸버, 캐시 크기 등). 지금은 이것이 우리가 필요한 전부입니다.

이제 우리의 템플릿 엔진이 준비되었고 Thymeleaf를 사용하여 페이지를 만들기 시작할 수 있습니다.

```

이 번역된 마크다운은 그대로 .md 파일에 복사하여 사용할 수 있습니다.



```
