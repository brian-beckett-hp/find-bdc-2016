/*
 * Copyright 2015 Hewlett-Packard Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

package com.hp.autonomy.frontend.find.core.web;

import com.hp.autonomy.frontend.find.core.beanconfiguration.DispatcherServletConfiguration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

import javax.servlet.RequestDispatcher;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@Controller
@Slf4j
public class CustomErrorController {
    private final ControllerUtils controllerUtils;

    @Autowired
    public CustomErrorController(final ControllerUtils controllerUtils) {
        this.controllerUtils = controllerUtils;
    }

    @RequestMapping(DispatcherServletConfiguration.AUTHENTICATION_ERROR_PATH)
    public ModelAndView authenticationErrorPage(final HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {
        return controllerUtils.buildErrorModelAndView(request, "error.authenticationErrorMain", "error.authenticationErrorSub", null, response.getStatus(), false, null);
    }

    @RequestMapping(DispatcherServletConfiguration.CLIENT_AUTHENTICATION_ERROR_PATH)
    public ModelAndView clientAuthenticationErrorPage(
            @RequestParam("statusCode") final int statusCode,
            final HttpServletRequest request
    ) throws ServletException, IOException {
        return controllerUtils.buildErrorModelAndView(request, "error.clientAuthenticationErrorMain", "error.clientAuthenticationErrorSub", null, statusCode, false, null);
    }

    @RequestMapping(DispatcherServletConfiguration.SERVER_ERROR_PATH)
    public ModelAndView serverErrorPage(final HttpServletRequest request, final HttpServletResponse response) {
        final Exception exception = (Exception) request.getAttribute(RequestDispatcher.ERROR_EXCEPTION);

        return controllerUtils.buildErrorModelAndView(request, "error.internalServerErrorMain", "error.internalServerErrorSub", null, response.getStatus(), true, exception);
    }

    @RequestMapping(DispatcherServletConfiguration.NOT_FOUND_ERROR_PATH)
    public ModelAndView notFoundError(final HttpServletRequest request, final HttpServletResponse response) {
        return controllerUtils.buildErrorModelAndView(request, "error.notFoundMain", "error.notFoundSub", null, response.getStatus(), true, null);
    }
}
